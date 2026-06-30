pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Baixando o código do GitHub...'
                // O Jenkins vai baixar o código automaticamente baseado na configuração que faremos abaixo
            }
        }
        stage('Build') {
            steps {
                echo 'Construindo o projeto...'
                // Aqui você pode colocar seus comandos Docker
                // sh 'docker build -t meu-projeto:latest .'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Subindo no meu servidor caseiro!'
                // sh 'docker run -d -p 3000:3000 meu-projeto:latest'
            }
        }
    }
}
