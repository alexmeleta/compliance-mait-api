const express = require('express');
const router = express.Router();
const { Role, Permission, RolePermission, User } = require('../models');
const { Op } = require('sequelize');
const { authGuard, requirePermissions } = require('../middleware/auth');

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
 * components:
 *   schemas:
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the permission
 *         objectGuid:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the permission
 *         code:
 *           type: string
 *           description: Permission code (e.g., CREATE_USER, VIEW_REPORTS)
 *         featureId:
 *           type: integer
 *           description: The ID of the feature associated with the permission
 *         feature:
 *           $ref: '#/components/schemas/Feature'
 *         permissionActionId:
 *           type: integer
 *           description: The ID of the permission action associated with the permission
 *         permissionAction:
 *           $ref: '#/components/schemas/PermissionAction'
 *       example:
 *         id: 1
 *         objectGuid: "550e8400-e29b-41d4-a716-446655440000"
 *         code: "CREATE_USER"
 *         featureId: 1
 *         feature:
 *           $ref: '#/components/schemas/Feature'
 *         permissionActionId: 1
 *         permissionAction:
 *           $ref: '#/components/schemas/PermissionAction'
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the role
 *         guid:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the role
 *         name:
 *           type: string
 *           description: The name of the role (e.g., Admin, User)
 *         description:
 *           type: string
 *           description: Description of the role and its purpose
 *         permissions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Permission'
 *           description: List of permissions associated with this role
 *       example:
 *         id: 1
 *         guid: "550e8400-e29b-41d4-a716-446655440000"
 *         name: "Admin"
 *         description: "Administrator with full system access"
 *         permissions:
 *           - id: 1
 *             code: "CREATE_USER"
 *             featureId: 1
 *             feature:
 *               $ref: '#/components/schemas/Feature'
 *             permissionActionId: 1
 *             permissionAction:
 *               $ref: '#/components/schemas/PermissionAction'
 *           - id: 2
 *             code: "DELETE_USER"
 *             featureId: 1
 *             feature:
 *               $ref: '#/components/schemas/Feature'
 *             permissionActionId: 2
 *             permissionAction:
 *               $ref: '#/components/schemas/PermissionAction'
 *     Feature:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the feature
 *         code:
 *           type: string
 *           description: Feature code (e.g., USERS, REPORTS)
 *         description:
 *           type: string
 *           description: Description of the feature and its purpose
 *       example:
 *         id: 1
 *         code: "USERS"
 *         description: "User management feature"
 *     PermissionAction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the permission action
 *         code:
 *           type: string
 *           description: Permission action code (e.g., CREATE, READ, UPDATE, DELETE)
 *         description:
 *           type: string
 *           description: Description of the permission action and its purpose
 *       example:
 *         id: 1
 *         code: "CREATE"
 *         description: "Create permission action"
 */

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: API for managing roles and permissions
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/', authGuard, async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: { attributes: [] } // Exclude join table
        }
      ]
    });
    
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the role to retrieve
 *     responses:
 *       200:
 *         description: Role details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authGuard, async (req, res) => {
  const id = req.params.id;
  try {
    const role = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: { attributes: [] } // Exclude join table
        }
      ]
    });
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the role
 *               description:
 *                 type: string
 *                 description: Description of the role
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of permission IDs to assign to the role
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role created successfully
 *                 role:
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/', authGuard, requirePermissions('MANAGE_ROLES'), async (req, res) => {
  const { name, description, permissionIds } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Role name is required' });
  }

  try {
    // Create new role
    const newRole = await Role.create({
      name,
      description
    });

    // Assign permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permissionId => ({
        roleId: newRole.id,
        permissionId
      }));
      
      await RolePermission.bulkCreate(rolePermissions);
    }

    // Fetch the created role with its permissions
    const roleWithPermissions = await Role.findByPk(newRole.id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: { attributes: [] } // Exclude join table
        }
      ]
    });

    res.status(201).json({
      message: 'Role created successfully',
      role: roleWithPermissions
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the role to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the role
 *               description:
 *                 type: string
 *                 description: Description of the role
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of permission IDs to assign to the role
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role updated successfully
 *                 role:
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authGuard, requirePermissions('MANAGE_ROLES'), async (req, res) => {
  const id = req.params.id;
  const { name, description, permissionIds } = req.body;

  try {
    const role = await Role.findByPk(id);
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Update role
    await role.update({
      name: name !== undefined ? name : role.name,
      description: description !== undefined ? description : role.description
    });
    
    // Update permissions if provided
    if (permissionIds) {
      // Remove existing permissions
      await RolePermission.destroy({
        where: { roleId: id }
      });
      
      // Add new permissions
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          roleId: id,
          permissionId
        }));
        
        await RolePermission.bulkCreate(rolePermissions);
      }
    }
    
    // Fetch the updated role with its permissions
    const updatedRole = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: { attributes: [] } // Exclude join table
        }
      ]
    });
    
    res.json({
      message: 'Role updated successfully',
      role: updatedRole
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the role to delete
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role deleted successfully
 *       400:
 *         description: Cannot delete role that has users assigned
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authGuard, requirePermissions('MANAGE_ROLES'), async (req, res) => {
  const id = req.params.id;
  
  try {
    const role = await Role.findByPk(id);
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if any users are assigned this role
    const usersWithRole = await User.count({
      where: { roleId: id }
    });
    
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete role that has users assigned. Reassign users to another role first.' 
      });
    }
    
    // Delete role permissions
    await RolePermission.destroy({
      where: { roleId: id }
    });
    
    // Delete role
    await role.destroy();
    
    res.json({
      message: 'Role deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
