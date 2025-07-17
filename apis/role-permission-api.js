const express = require('express');
const router = express.Router();
const { Role, Permission, RolePermission, User } = require('../models');
const { Op } = require('sequelize');
const { authGuard, requirePermissions } = require('../middleware/auth');
const sequelize = require('../models/index').sequelize;

// Middleware to parse JSON bodies
router.use(express.json());

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: API for managing roles and permissions
 */

/**
 * @swagger
 * /api/roles/{id}/permissions:
 *   get:
 *     summary: Get permissions for a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the role
 *     responses:
 *       200:
 *         description: List of permissions for the role
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Permission'
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.get('/:id/permissions', authGuard, async (req, res) => {
  const id = req.params.id;
  try {
    const role = await Role.findByPk(id);
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    const permissions = await role.getPermissions();
    
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/roles/{id}/permissions:
 *   post:
 *     summary: Add permissions to a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - code
 *                     - featureId
 *                     - permissionActionId
 *                   properties:
 *                     code:
 *                       type: string
 *                       description: Unique code for the permission (e.g., 'CREATE_USER')
 *                     featureId:
 *                       type: integer
 *                       description: ID of the feature this permission is for
 *                     permissionActionId:
 *                       type: integer
 *                       description: ID of the action this permission allows
 *     responses:
 *       200:
 *         description: Permissions added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Permissions processed successfully
 *                 createdPermissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *                 existingPermissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Bad request - Invalid input data
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.post('/:id/permissions', authGuard, async (req, res) => {
  const roleId = req.params.id;
  const { permissions } = req.body;

  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ message: 'Permissions array is required' });
  }

  // Validate each permission object
  const invalidPermissions = permissions.filter(perm => 
    !perm.code || !perm.featureId || !perm.permissionActionId
  );

  if (invalidPermissions.length > 0) {
    return res.status(400).json({ 
      message: 'Each permission must have code, featureId, and permissionActionId',
      invalidPermissions
    });
  }

  const transaction = await sequelize.transaction();
  
  try {
    // Check if role exists
    const role = await Role.findByPk(roleId, { transaction });
    if (!role) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Role not found' });
    }

    // Get existing permissions for this role
    const existingRolePermissions = await RolePermission.findAll({
      where: { roleId },
      include: [Permission],
      transaction
    });

    const existingPermissionMap = new Map(
      existingRolePermissions.map(rp => [rp.Permission.code, rp.Permission])
    );

    const results = {
      createdPermissions: [],
      existingPermissions: []
    };

    // Process each permission
    for (const perm of permissions) {
      const { code, featureId, permissionActionId } = perm;
      
      // Check if permission already exists for this role
      if (existingPermissionMap.has(code)) {
        results.existingPermissions.push(existingPermissionMap.get(code));
        continue;
      }

      // Find or create the permission
      const [permission] = await Permission.findOrCreate({
        where: { 
          code,
          featureId,
          permissionActionId
        },
        defaults: {
          objectGuid: require('uuid').v4(),
          code,
          featureId,
          permissionActionId
        },
        transaction
      });

      // Create role-permission association
      await RolePermission.create({
        roleId,
        permissionId: permission.id
      }, { transaction });

      results.createdPermissions.push(permission);
    }

    await transaction.commit();
    
    res.json({
      message: 'Permissions processed successfully',
      ...results
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Error processing permissions:', err);
    res.status(500).json({ 
      message: 'Failed to process permissions', 
      error: err.message 
    });
  }
});

/**
 * @swagger
 * /api/roles/{id}/permissions/{permissionId}:
 *   delete:
 *     summary: Remove a permission from a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the role
 *       - in: path
 *         name: permissionId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the permission to remove
 *     responses:
 *       200:
 *         description: Permission removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Permission removed successfully
 *       404:
 *         description: Role or permission not found
 *       500:
 *         description: Server error
 */
router.delete('/:id/permissions/:permissionId', authGuard, requirePermissions('MANAGE_ROLES'), async (req, res) => {
  const { id, permissionId } = req.params;
  
  try {
    const role = await Role.findByPk(id);
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if permission exists
    const permission = await Permission.findByPk(permissionId);
    
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    
    // Remove permission from role
    await RolePermission.destroy({
      where: {
        roleId: id,
        permissionId
      }
    });
    
    res.json({
      message: 'Permission removed successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/roles/permissions:
 *   get:
 *     summary: Get all available permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Permission'
 *       500:
 *         description: Server error
 */
router.get('/permissions/all', authGuard, async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [['code', 'ASC']]
    });
    
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
