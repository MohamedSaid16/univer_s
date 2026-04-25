import { Response } from "express";
import prisma from "../../config/database";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const getMyEnseignements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const enseignant = await prisma.enseignant.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!enseignant) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Teacher profile not found" },
      });
      return;
    }

    const enseignements = await prisma.enseignement.findMany({
      where: { enseignantId: enseignant.id },
      include: {
        module: true,
        promo: true,
        enseignant: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });

    res.json({
      success: true,
      data: enseignements,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch enseignements";
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message },
    });
  }
};
