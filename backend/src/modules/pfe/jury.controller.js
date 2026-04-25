const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class JuryController {
  async addMembre(req, res) {
    try {
      const groupId = req.params.groupId || req.body.groupId;
      const { enseignantId, role } = req.body;

      if (!groupId || !enseignantId || !role) {
        return res.status(400).json({
          success: false,
          error: "groupId, enseignantId et role sont requis",
        });
      }

      const juryExistant = await prisma.pfeJury.findFirst({
        where: { enseignantId: parseInt(enseignantId) },
      });

      if (juryExistant) {
        return res.status(400).json({
          success: false,
          error: "Cet enseignant est déjà membre d'un jury pour un autre groupe",
        });
      }

      const jury = await prisma.pfeJury.create({
        data: {
          groupId: parseInt(groupId),
          enseignantId: parseInt(enseignantId),
          role,
        },
        include: {
          group: true,
          enseignant: {
            include: { user: true },
          },
        },
      });

      res.status(201).json({ success: true, data: jury });
    } catch (error) {
      console.error("Erreur ajout jury:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const jury = await prisma.pfeJury.findMany({
        include: {
          group: true,
          enseignant: {
            include: { user: true },
          },
        },
      });

      res.json({ success: true, data: jury });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getByGroup(req, res) {
    try {
      const { groupId } = req.params;
      const jury = await prisma.pfeJury.findMany({
        where: { groupId: parseInt(groupId) },
        include: {
          enseignant: {
            include: { user: true },
          },
        },
      });

      res.json({ success: true, data: jury });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ success: false, error: "Le role est requis" });
      }

      const jury = await prisma.pfeJury.update({
        where: { id: parseInt(id) },
        data: { role },
        include: {
          enseignant: {
            include: { user: true },
          },
        },
      });

      res.json({ success: true, data: jury });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.pfeJury.delete({
        where: { id: parseInt(id) },
      });
      res.json({ success: true, message: "Membre supprimé du jury" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = { JuryController };