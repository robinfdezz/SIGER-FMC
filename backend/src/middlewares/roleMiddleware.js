/**
 * Middleware para validar que el usuario autenticado posea uno de los roles autorizados.
 * @param {string[]} allowedRoles - Lista de nombres de roles permitidos (ej. ['SuperAdmin', 'Admin_Sucursal'])
 */
const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado. Sesión requerida.'
      });
    }

    const userRole = String(req.user.rol_nombre || req.user.rol || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
};

/**
 * Middleware para aplicar aislamiento de datos por sucursal.
 * - SuperAdmin: Acceso global a todas las sucursales.
 * - Otros roles: Restringidos a su propia sucursal (`req.user.sucursal_id`).
 */
const requireBranchAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado.'
    });
  }

  // SuperAdmin tiene acceso omnicanal
  const userRole = String(req.user.rol_nombre || req.user.rol || '').toLowerCase();
  if (userRole === 'superadmin') {
    req.isSuperAdmin = true;
    return next();
  }

  // Para otros roles, adjuntar el filtro estricto de sucursal
  req.isSuperAdmin = false;
  req.filterSucursalId = req.user.sucursal_id;
  next();
};

module.exports = {
  checkRole,
  requireBranchAccess
};
