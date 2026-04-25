const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class DomainError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function resolveEtudiantByUserId(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new DomainError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  const etudiant = await prisma.etudiant.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!etudiant) {
    throw new DomainError(403, 'NOT_A_STUDENT', 'Current user is not a student');
  }
  return etudiant;
}

async function findCurrentMembership(etudiantId) {
  return prisma.groupMember.findFirst({
    where: { etudiantId },
    orderBy: { group: { dateCreation: 'desc' } },
    select: { groupId: true, role: true },
  });
}

async function getMyGroup(userId) {
  const etudiant = await resolveEtudiantByUserId(userId);
  const membership = await findCurrentMembership(etudiant.id);
  if (!membership) {
    return { group: null };
  }

  const group = await prisma.groupPfe.findUnique({
    where: { id: membership.groupId },
    select: {
      id: true,
      nom_ar: true,
      nom_en: true,
      dateCreation: true,
      dateAffectation: true,
      dateSoutenance: true,
      salleSoutenance: true,
      validationFinale: true,
      sujetFinal: {
        select: {
          id: true,
          titre_ar: true,
          titre_en: true,
          description_ar: true,
          typeProjet: true,
          status: true,
          anneeUniversitaire: true,
          promoId: true,
        },
      },
      coEncadrant: {
        select: {
          id: true,
          bureau: true,
          user: {
            select: { id: true, nom: true, prenom: true, email: true },
          },
        },
      },
      groupMembers: {
        select: {
          role: true,
          etudiant: {
            select: {
              id: true,
              matricule: true,
              user: { select: { id: true, nom: true, prenom: true, email: true } },
            },
          },
        },
      },
    },
  });

  return { group, myRole: membership.role };
}

async function getMyDeadlines(userId) {
  const etudiant = await resolveEtudiantByUserId(userId);
  const membership = await findCurrentMembership(etudiant.id);
  if (!membership) {
    return { groupId: null, deadlines: [] };
  }

  const group = await prisma.groupPfe.findUnique({
    where: { id: membership.groupId },
    select: {
      id: true,
      dateSoutenance: true,
      salleSoutenance: true,
      compteRendus: {
        where: { prochaineReunion: { not: null } },
        orderBy: { prochaineReunion: 'asc' },
        select: {
          id: true,
          dateReunion: true,
          prochaineReunion: true,
          actionsDecidees: true,
        },
      },
    },
  });

  const deadlines = [];
  if (group && group.dateSoutenance) {
    deadlines.push({
      type: 'soutenance',
      label: 'Soutenance',
      dueAt: group.dateSoutenance,
      location: group.salleSoutenance,
      source: 'group',
      sourceId: group.id,
    });
  }
  for (const cr of (group && group.compteRendus) || []) {
    deadlines.push({
      type: 'meeting',
      label: 'Prochaine réunion',
      dueAt: cr.prochaineReunion,
      source: 'compte_rendu',
      sourceId: cr.id,
      note: cr.actionsDecidees,
    });
  }

  deadlines.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  return { groupId: group ? group.id : null, deadlines };
}

async function getMyGrade(userId) {
  const etudiant = await resolveEtudiantByUserId(userId);
  const membership = await findCurrentMembership(etudiant.id);
  if (!membership) {
    return { available: false };
  }

  const group = await prisma.groupPfe.findUnique({
    where: { id: membership.groupId },
    select: {
      validationFinale: true,
      note: true,
      mention: true,
    },
  });

  if (!group || group.validationFinale !== true) {
    return { available: false };
  }

  return { available: true, note: group.note, mention: group.mention };
}

module.exports = { getMyGroup, getMyDeadlines, getMyGrade, DomainError };
