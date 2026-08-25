// Ruta de inicio según el rol. El panel web es solo para ADMIN/OWNER/BARBER;
// los CLIENT usan la app móvil y no tienen dashboard aquí.
export const ROLE_HOME = {
  ADMIN: '/superadmin/dashboard',
  OWNER: '/owner/dashboard',
  BARBER: '/barber/agenda',
}

export const roleHome = (role) => ROLE_HOME[role] || null
