// ============================================================
// CONTROLLER — admin.clubs.controller.ts
// Re-exporte les fonctions depuis admin.controller.ts pour
// maintenir la compatibilité avec les imports du router
// ============================================================
export {
    listClubs,
    create,
    update,
    activate,
    deactivate,
    remove,
} from './admin.controller';
