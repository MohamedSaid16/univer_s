const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const toPositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
};

const resolvePromoId = async (rawPromoId) => {
  const directPromoId = toPositiveInt(rawPromoId);
  if (directPromoId) {
    return directPromoId;
  }

  const fallbackPromo = await prisma.promo.findFirst({
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  return fallbackPromo?.id || null;
};

class SujetController {
  // Créer un sujet PFE
  async create(req, res) {
  try {
    const data = req.body;
    const enseignantId = toPositiveInt(data.enseignantId);
    const promoId = await resolvePromoId(data.promoId);
    const anneeUniversitaire =
      typeof data.anneeUniversitaire === 'string' && data.anneeUniversitaire.trim()
        ? data.anneeUniversitaire.trim()
        : getCurrentAcademicYear();
    const maxGrps = Number(data.maxGrps ?? data.max_grps ?? 1) || 1;

    if (!enseignantId) {
      return res.status(400).json({
        success: false,
        error: 'enseignantId est requis et doit etre un entier positif',
      });
    }

    if (!promoId) {
      return res.status(400).json({
        success: false,
        error: 'Aucune promo disponible. Veuillez configurer les promotions ou fournir promoId.',
      });
    }

    // Vérifier si la proposition des sujets est ouverte.
    // Fallback to latest config by name because nom_config is unique globally.
let propositionOuverte = await prisma.pfeConfig.findFirst({
  where: {
    nom_config: 'proposition_sujets_ouverte',
    anneeUniversitaire,
  },
});

if (!propositionOuverte) {
  propositionOuverte = await prisma.pfeConfig.findFirst({
    where: { nom_config: 'proposition_sujets_ouverte' },
    orderBy: { updatedAt: 'desc' },
  });
}

if (!propositionOuverte || propositionOuverte.valeur !== 'true') {
  return res.status(403).json({ 
    success: false, 
    error: 'La proposition des sujets est fermée pour le moment. Veuillez contacter l\'administration.' 
  });
}
    
    // RÈGLE 2: Vérifier le nombre de sujets par enseignant (max 3)
    const sujetsCount = await prisma.pfeSujet.count({
      where: { 
        enseignantId,
        anneeUniversitaire
      }
    });
    
    if (sujetsCount >= 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Un enseignant ne peut pas proposer plus de 3 sujets par année universitaire' 
      });
    }
    
    const sujet = await prisma.pfeSujet.create({
      data: {
        titre_ar:         data.titre_ar        ?? data.titre         ?? '',
        titre_en:         data.titre_en        ?? null,
        description_ar:   data.description_ar  ?? data.description   ?? '',
        description_en:   data.description_en  ?? null,
        keywords_ar:      data.keywords_ar     ?? data.keywords      ?? null,
        keywords_en:      data.keywords_en     ?? null,
        workplan_ar:      data.workplan_ar     ?? data.workplan      ?? null,
        workplan_en:      data.workplan_en     ?? null,
        bibliographie_ar: data.bibliographie_ar ?? data.bibliographie ?? null,
        bibliographie_en: data.bibliographie_en ?? null,
        enseignantId,
        promoId,
        typeProjet: data.typeProjet || 'application',
        status: data.status || 'propose',
        anneeUniversitaire,
        maxGrps
      },
      include: {
        enseignant: {
          include: { user: true }
        },
        promo: true
      }
    });
    
    res.status(201).json({ success: true, data: sujet });
  } catch (error) {
    console.error('Erreur création:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
  // Récupérer tous les sujets
  async getAll(req, res) {
    try {
      const teacherId = toPositiveInt(req.query.enseignantId ?? req.query.teacherId ?? req.query.teacherProfileId);
      const status = typeof req.query.status === 'string' && req.query.status.trim() ? req.query.status.trim() : null;
      const anneeUniversitaire =
        typeof req.query.anneeUniversitaire === 'string' && req.query.anneeUniversitaire.trim()
          ? req.query.anneeUniversitaire.trim()
          : null;

      const where = {};

      if (teacherId) {
        where.enseignantId = teacherId;
      }

      if (status) {
        where.status = status;
      }

      if (anneeUniversitaire) {
        where.anneeUniversitaire = anneeUniversitaire;
      }

      const sujets = await prisma.pfeSujet.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        include: {
          enseignant: {
            include: { user: true }
          },
          promo: true,
          groupsPfe: true,
          groupSujets: true,
        }
      });
      res.json({ success: true, data: sujets });
    } catch (error) {
      console.error('Erreur récupération:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Récupérer un sujet par ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const sujet = await prisma.pfeSujet.findUnique({
        where: { id: parseInt(id) },
        include: {
          enseignant: true,
          promo: true,
          groupSujets: true
        }
      });
      
      if (!sujet) {
        return res.status(404).json({ success: false, error: 'Sujet non trouvé' });
      }
      
      res.json({ success: true, data: sujet });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération' });
    }
  }

  // Mettre à jour un sujet
  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const updateData = {
        enseignantId: data.enseignantId ? parseInt(data.enseignantId) : undefined,
        promoId: data.promoId ? parseInt(data.promoId) : undefined,
        typeProjet: data.typeProjet,
        status: data.status,
        anneeUniversitaire: data.anneeUniversitaire,
        maxGrps: data.maxGrps,
      };

      // Map bilingual fields only when provided (supports legacy single-language payload).
      if (data.titre_ar !== undefined)         updateData.titre_ar = data.titre_ar;
      else if (data.titre !== undefined)       updateData.titre_ar = data.titre;
      if (data.titre_en !== undefined)         updateData.titre_en = data.titre_en;

      if (data.description_ar !== undefined)   updateData.description_ar = data.description_ar;
      else if (data.description !== undefined) updateData.description_ar = data.description;
      if (data.description_en !== undefined)   updateData.description_en = data.description_en;

      if (data.keywords_ar !== undefined)      updateData.keywords_ar = data.keywords_ar;
      else if (data.keywords !== undefined)    updateData.keywords_ar = data.keywords;
      if (data.keywords_en !== undefined)      updateData.keywords_en = data.keywords_en;

      if (data.workplan_ar !== undefined)      updateData.workplan_ar = data.workplan_ar;
      else if (data.workplan !== undefined)    updateData.workplan_ar = data.workplan;
      if (data.workplan_en !== undefined)      updateData.workplan_en = data.workplan_en;

      if (data.bibliographie_ar !== undefined)    updateData.bibliographie_ar = data.bibliographie_ar;
      else if (data.bibliographie !== undefined)  updateData.bibliographie_ar = data.bibliographie;
      if (data.bibliographie_en !== undefined)    updateData.bibliographie_en = data.bibliographie_en;

      const sujet = await prisma.pfeSujet.update({
        where: { id: parseInt(id) },
        data: updateData
      });
      res.json({ success: true, data: sujet });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
    }
  }

  // Supprimer un sujet
  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.pfeSujet.delete({
        where: { id: parseInt(id) }
      });
      res.json({ success: true, message: 'Sujet supprimé avec succès' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Erreur lors de la suppression' });
    }
  }
}

module.exports = { SujetController };
