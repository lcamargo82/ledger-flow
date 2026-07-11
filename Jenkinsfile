pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    tools {
        nodejs 'node-24'
    }

    environment {
        DEPLOY_HOST = '192.168.15.174'
        DEPLOY_USER = 'camargo'
        DEPLOY_PATH = '/home/camargo/apps/ledger-flow'
        SSH_CREDENTIALS_ID = 'ledgerflow-ctn01-ssh'
        COMPOSE_PROJECT_NAME = 'ledgerflow'
        COMPOSE_FILES = '-f docker-compose.prod.yml'
        API_HEALTHCHECK_URL = 'http://127.0.0.1:3010/health/readiness'
        WEB_HEALTHCHECK_URL = 'http://127.0.0.1:5180'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate deployment files') {
            steps {
                sh '''
                    set -eu
                    command -v docker
                    command -v ssh
                    command -v tar
                    command -v node
                    command -v npm

                    test -f Jenkinsfile
                    test -f docker-compose.yml
                    test -f docker-compose.prod.yml

                    VALIDATION_ENV_BACKUP=""
                    cleanup_validation_env() {
                      if [ -n "${VALIDATION_ENV_BACKUP}" ]; then
                        mv "${VALIDATION_ENV_BACKUP}" .env
                      else
                        rm -f .env
                      fi
                    }
                    trap cleanup_validation_env EXIT

                    if [ -f .env ]; then
                      VALIDATION_ENV_BACKUP=".env.validate-backup-$$"
                      mv .env "${VALIDATION_ENV_BACKUP}"
                    fi

                    cp .env.production.example .env
                    docker compose --env-file .env -f docker-compose.prod.yml config -q
                '''
            }
        }

        stage('Install and test') {
            steps {
                sh '''
                    set -eu
                    export npm_config_cache="$WORKSPACE/.npm-cache"
                    node --version
                    npm --version

                    cd apps/api
                    npm ci
                    npm run prisma:generate
                    npm test -- --runInBand
                    npm run build

                    cd ../web
                    npm ci --ignore-scripts
                    npm run test:unit -- --run
                    npm run i18n:check
                    npm run build
                '''
            }
        }

        stage('Sync workspace to server') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: env.SSH_CREDENTIALS_ID,
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu
                        REMOTE_USER="${SSH_USER:-${DEPLOY_USER}}"
                        SSH_OPTS="-i ${SSH_KEY} -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
                        REMOTE_STAGING="${DEPLOY_PATH}.staging-${BUILD_NUMBER}"

                        ssh ${SSH_OPTS} ${REMOTE_USER}@${DEPLOY_HOST} "
                          set -eu
                          command -v tar > /dev/null
                          rm -rf ${REMOTE_STAGING}
                          mkdir -p ${REMOTE_STAGING}
                        "

                        tar -czf - \
                          --exclude='./.git' \
                          --exclude='./.env' \
                          --exclude='./.npm-cache' \
                          --exclude='./apps/api/node_modules' \
                          --exclude='./apps/api/dist' \
                          --exclude='./apps/web/node_modules' \
                          --exclude='./apps/web/dist' \
                          . | ssh ${SSH_OPTS} ${REMOTE_USER}@${DEPLOY_HOST} "tar -xzf - -C ${REMOTE_STAGING}"

                        ssh ${SSH_OPTS} ${REMOTE_USER}@${DEPLOY_HOST} "
                          set -eu
                          mkdir -p ${DEPLOY_PATH}
                          find ${DEPLOY_PATH} -mindepth 1 -maxdepth 1 \
                            ! -name .env \
                            ! -name .deploy-backups \
                            -exec rm -rf -- {} +
                          cp -a ${REMOTE_STAGING}/. ${DEPLOY_PATH}/
                          rm -rf ${REMOTE_STAGING}
                        "
                    '''
                }
            }
        }

        stage('Preflight remote environment') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: env.SSH_CREDENTIALS_ID,
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu
                        REMOTE_USER="${SSH_USER:-${DEPLOY_USER}}"
                        ssh -i "${SSH_KEY}" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new ${REMOTE_USER}@${DEPLOY_HOST} "
                          set -eu
                          cd ${DEPLOY_PATH}
                          test -f .env || {
                            echo 'ERRO: crie ${DEPLOY_PATH}/.env no servidor antes do deploy. Use .env.production.example como checklist, sem versionar segredos.'
                            exit 10
                          }
                          docker compose --env-file .env ${COMPOSE_FILES} config -q
                          mkdir -p .deploy-backups
                          docker compose --env-file .env ${COMPOSE_FILES} ps > .deploy-backups/compose-ps-${BUILD_NUMBER}.txt || true
                          docker compose --env-file .env ${COMPOSE_FILES} images > .deploy-backups/compose-images-${BUILD_NUMBER}.txt || true
                        "
                    '''
                }
            }
        }

        stage('Build images on server') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: env.SSH_CREDENTIALS_ID,
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu
                        REMOTE_USER="${SSH_USER:-${DEPLOY_USER}}"
                        ssh -i "${SSH_KEY}" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new ${REMOTE_USER}@${DEPLOY_HOST} "
                          set -eu
                          cd ${DEPLOY_PATH}
                          export LEDGERFLOW_IMAGE_TAG=${BUILD_NUMBER}
                          docker compose --env-file .env ${COMPOSE_FILES} build migrate api worker web
                        "
                    '''
                }
            }
        }

        stage('Deploy infrastructure and migrations') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: env.SSH_CREDENTIALS_ID,
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu
                        REMOTE_USER="${SSH_USER:-${DEPLOY_USER}}"
                        ssh -i "${SSH_KEY}" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new ${REMOTE_USER}@${DEPLOY_HOST} "
                          set -eu
                          cd ${DEPLOY_PATH}
                          export LEDGERFLOW_IMAGE_TAG=${BUILD_NUMBER}
                          docker compose --env-file .env ${COMPOSE_FILES} up -d postgres mongodb redis rabbitmq mailpit prometheus grafana
                          docker compose --env-file .env ${COMPOSE_FILES} run --rm migrate
                        "
                    '''
                }
            }
        }

        stage('Deploy application') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: env.SSH_CREDENTIALS_ID,
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu
                        REMOTE_USER="${SSH_USER:-${DEPLOY_USER}}"
                        ssh -i "${SSH_KEY}" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new ${REMOTE_USER}@${DEPLOY_HOST} "
                          set -eu
                          cd ${DEPLOY_PATH}
                          export LEDGERFLOW_IMAGE_TAG=${BUILD_NUMBER}
                          docker compose --env-file .env ${COMPOSE_FILES} up -d api worker web
                          docker compose --env-file .env ${COMPOSE_FILES} ps
                        "
                    '''
                }
            }
        }

        stage('Verify deployment') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: env.SSH_CREDENTIALS_ID,
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu
                        REMOTE_USER="${SSH_USER:-${DEPLOY_USER}}"
                        ssh -i "${SSH_KEY}" \
                          -o IdentitiesOnly=yes \
                          -o BatchMode=yes \
                          -o StrictHostKeyChecking=accept-new \
                          ${REMOTE_USER}@${DEPLOY_HOST} \
                          sh -s -- "${API_HEALTHCHECK_URL}" "${WEB_HEALTHCHECK_URL}" "${DEPLOY_PATH}" <<'REMOTE_SCRIPT'
                          set -eu
                          API_URL="$1"
                          WEB_URL="$2"
                          APP_PATH="$3"
                          attempt=1

                          until curl -fsS "$API_URL"; do
                            if [ "$attempt" -ge 30 ]; then
                              echo 'API readiness failed after 30 attempts'
                              docker compose \
                                --env-file "$APP_PATH/.env" \
                                -f "$APP_PATH/docker-compose.prod.yml" \
                                logs --tail=120 api
                              exit 20
                            fi
                            attempt=$((attempt + 1))
                            sleep 5
                          done

                          curl -fsS "$WEB_URL" > /dev/null
REMOTE_SCRIPT
                    '''
                }
            }
        }
    }

    post {
        failure {
            echo 'Deploy falhou. Verifique os arquivos .deploy-backups no servidor e os logs do Jenkins.'
        }
        success {
            echo 'Deploy LedgerFlow concluído e healthchecks responderam com sucesso.'
        }
    }
}
