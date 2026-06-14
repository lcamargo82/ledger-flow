# LedgerFlow UX Foundation Plan

## Overview
Implementation of Phase 2E — UX Foundation. Establishing robust UI components, internationalization, and error handling for the frontend.

## Project Type
WEB

## Success Criteria
- i18n correctly switches between pt-BR and en-US.
- 14 common UI components are built and reusable.
- Toast and Confirmation dialogs work globally.
- Login, Dashboard, and Error views are refined using the new components.
- Typography and corporate dark mode CSS are updated and legible.
- Documentation is fully updated to reflect Phase 2E completion.

## Tech Stack
- Vue 3 + TypeScript
- Pinia (Stores for toast, auth)
- Vue Router (New forgot-password route)
- Axios (HTTP interceptor refinement)

## File Structure
- `apps/web/src/locales/`
- `apps/web/src/components/common/`
- `apps/web/src/stores/`
- `apps/web/src/utils/`
- `apps/web/src/views/`

## Task Breakdown
1. **i18n Foundation**: Create JSON locale files and `useI18n` composable. (Agent: frontend-specialist)
   - INPUT: Empty locales directory.
   - OUTPUT: `pt-BR.json`, `en-US.json`, `useI18n.ts`.
   - VERIFY: Calling `t('auth.login.title')` returns translation.
2. **Global CSS Update**: Refine `main.css`. (Agent: frontend-specialist)
   - INPUT: Existing `main.css`.
   - OUTPUT: Updated `main.css` with correct typography and color tokens.
   - VERIFY: Text sizes are at least 15px/16px.
3. **Common Components (Part 1 - Forms & Basics)**: AppButton, AppInput, AppPasswordInput, AppAlert, AppCard, LanguageSwitcher, AppBadge, AppLoading. (Agent: frontend-specialist)
   - INPUT: Empty common directory.
   - OUTPUT: Vue component files.
   - VERIFY: Components render and accept props.
4. **Common Components (Part 2 - Global States & Modals)**: AppModal, AppConfirmDialog, AppToast, AppToastContainer, AppEmptyState, AppErrorState, AppPageHeader. (Agent: frontend-specialist)
   - INPUT: Empty common directory.
   - OUTPUT: Vue component files.
   - VERIFY: Components render and accept props.
5. **Stores & Interceptors**: Create toast/confirm stores, update `http-client.ts` with `http-error.ts`. (Agent: frontend-specialist)
   - INPUT: Existing `http-client.ts`.
   - OUTPUT: `toast.store.ts`, `confirm-dialog.store.ts`, `http-error.ts`, updated `http-client.ts`.
   - VERIFY: Network errors trigger appropriate toasts and token cleanup.
6. **Refine Views**: Update LoginView, DashboardView, NotFoundView, ForbiddenView. Add ForgotPasswordView. Update AuthLayout, AppLayout. (Agent: frontend-specialist)
   - INPUT: Existing views and layouts.
   - OUTPUT: Updated views using new components and i18n.
   - VERIFY: Views render correctly with new corporate dark styling.
7. **Documentation**: Update all project docs. (Agent: project-planner / frontend-specialist)
   - INPUT: Existing markdown files.
   - OUTPUT: Updated docs reflecting Phase 2E.
   - VERIFY: `docs/backlog.md` shows Phase 2E as complete.

## Phase X: Verification
- [ ] Lint: `npm run lint` passes (if available).
- [ ] Build: `npm run build` succeeds.
- [ ] Manual test of all login/logout and language switcher flows.
