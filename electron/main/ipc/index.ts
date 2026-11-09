import { ipcMain, app, BrowserWindow } from "electron";
import { dialog } from "electron";
import fs from "fs";
import { parseExcelMatrix, type ImportedBudgetRow } from "../excel";
import { importExcelRows } from "../importer";
import { getPrismaClient, initDatabase } from "../db";
import type {
  IpcResponse,
  ProjectSummary,
  ThemeMode,
} from "../../preload/types";

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // App info
  ipcMain.handle("app:getVersion", () => app.getVersion());

  // Window management
  ipcMain.on("window:minimize", () => mainWindow.minimize());
  ipcMain.on("window:maximize", () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on("window:close", () => mainWindow.close());

  // Language setting persistence in SQLite
  ipcMain.handle("app:getLanguage", async (): Promise<string> => {
    try {
      const prisma = getPrismaClient();
      const setting = await prisma.appSetting.findUnique({
        where: { key: "language" },
      });
      return setting?.value || "es";
    } catch {
      return "es";
    }
  });

  ipcMain.handle(
    "app:setLanguage",
    async (_event, lang: string): Promise<boolean> => {
      try {
        const prisma = getPrismaClient();
        await prisma.appSetting.upsert({
          where: { key: "language" },
          update: { value: lang },
          create: { key: "language", value: lang },
        });
        return true;
      } catch (error) {
        console.error("Failed to save language setting:", error);
        return false;
      }
    },
  );

  // Theme setting persistence in SQLite
  ipcMain.handle("app:getTheme", async (): Promise<ThemeMode> => {
    try {
      const prisma = getPrismaClient();
      const setting = await prisma.appSetting.findUnique({
        where: { key: "theme" },
      });
      if (
        setting?.value === "light" ||
        setting?.value === "dark" ||
        setting?.value === "system"
      ) {
        return setting.value as ThemeMode;
      }
      return "system";
    } catch {
      return "system";
    }
  });

  ipcMain.handle(
    "app:setTheme",
    async (_event, theme: ThemeMode): Promise<boolean> => {
      try {
        const prisma = getPrismaClient();
        await prisma.appSetting.upsert({
          where: { key: "theme" },
          update: { value: theme },
          create: { key: "theme", value: theme },
        });
        return true;
      } catch (error) {
        console.error("Failed to save theme setting:", error);
        return false;
      }
    },
  );

  // DB Connection check
  ipcMain.handle("db:checkConnection", async () => {
    const res = await initDatabase();
    return {
      connected: res.success,
      message: res.message,
    };
  });

  // Projects list
  ipcMain.handle(
    "projects:getAll",
    async (): Promise<IpcResponse<ProjectSummary[]>> => {
      try {
        const prisma = getPrismaClient();
        const projects = await prisma.project.findMany({
          orderBy: { updatedAt: "desc" },
          include: {
            _count: {
              select: {
                suppliers: true,
                items: true,
              },
            },
            suppliers: {
              include: { supplier: { select: { name: true } } },
              orderBy: { orderIndex: "asc" },
            },
          },
        });

        const formatted: ProjectSummary[] = projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          client: p.client,
          currency: p.currency,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          suppliersCount: p._count.suppliers,
          supplierNames: p.suppliers.map((link) => link.supplier.name),
          itemsCount: p._count.items,
        }));

        return { success: true, data: formatted };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown database error";
        return { success: false, error: message };
      }
    },
  );

  // Create project
  ipcMain.handle(
    "projects:create",
    async (
      _event,
      data: {
        name: string;
        description?: string;
        client?: string;
        currency?: string;
        supplierIds?: string[];
      },
    ) => {
      try {
        const prisma = getPrismaClient();
        const created = await prisma.project.create({
          data: {
            name: data.name,
            description: data.description || null,
            client: data.client || null,
            currency: data.currency || "USD",
            suppliers: {
              create: [...new Set(data.supplierIds || [])].map(
                (supplierId, orderIndex) => ({ supplierId, orderIndex }),
              ),
            },
          },
        });

        return {
          success: true,
          data: { id: created.id, name: created.name },
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown error creating project";
        return { success: false, error: message };
      }
    },
  );

  ipcMain.handle(
    "projects:update",
    async (
      _event,
      id: string,
      data: {
        name: string;
        description?: string;
        client?: string;
        currency?: string;
        supplierIds?: string[];
      },
    ) => {
      try {
        const prisma = getPrismaClient();
        const updated = await prisma.$transaction(async (tx) => {
          const project = await tx.project.update({
            where: { id },
            data: {
              name: data.name.trim(),
              description: data.description || null,
              client: data.client || null,
              currency: data.currency || "USD",
            },
          });
          await tx.projectSupplier.deleteMany({ where: { projectId: id } });
          for (const [orderIndex, supplierId] of [
            ...new Set(data.supplierIds || []),
          ].entries())
            await tx.projectSupplier.create({
              data: { projectId: id, supplierId, orderIndex },
            });
          return project;
        });
        return { success: true, data: { id: updated.id, name: updated.name } };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update project",
        };
      }
    },
  );

  ipcMain.handle("projects:delete", async (_event, id: string) => {
    try {
      if (typeof id !== "string" || !id.trim())
        throw new Error("Invalid project id.");
      const prisma = getPrismaClient();
      await prisma.$transaction(async (tx) => {
        await tx.project.delete({ where: { id } });
      });
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete project.",
      };
    }
  });

  ipcMain.handle("suppliers:getAll", async () => {
    try {
      const suppliers = await getPrismaClient().supplier.findMany({
        include: {
          projects: {
            include: { project: { select: { id: true, name: true } } },
          },
          _count: { select: { quotes: true } },
        },
        orderBy: { name: "asc" },
      });
      return {
        success: true,
        data: suppliers.map(({ projects, ...supplier }) => ({
          ...supplier,
          projects: projects.map(({ project }) => project),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch suppliers",
      };
    }
  });

  ipcMain.handle(
    "suppliers:save",
    async (
      _event,
      data: {
        id?: string;
        name: string;
        contact?: string;
        email?: string;
        phone?: string;
        color?: string;
      },
    ) => {
      try {
        const name = data.name.trim();
        if (name.length < 2)
          return {
            success: false,
            error: "Supplier name must have at least 2 characters",
          };
        const prisma = getPrismaClient();
        const duplicates = await prisma.supplier.findMany({
          select: { id: true, name: true },
        });
        const duplicate = duplicates.find(
          (supplier) =>
            supplier.name.trim().toLocaleLowerCase() ===
            name.toLocaleLowerCase(),
        );
        if (duplicate && duplicate.id !== data.id)
          return {
            success: false,
            error: "A supplier with this name already exists",
          };
        const fields = {
          name,
          contact: data.contact?.trim() || null,
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          color: data.color || null,
        };
        const supplier = data.id
          ? await prisma.supplier.update({
              where: { id: data.id },
              data: fields,
            })
          : await prisma.supplier.create({ data: fields });
        return { success: true, data: { ...supplier, projects: [] } };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to save supplier",
        };
      }
    },
  );

  ipcMain.handle("suppliers:delete", async (_event, id: string) => {
    try {
      await getPrismaClient().supplier.delete({ where: { id } });
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete supplier",
      };
    }
  });

  ipcMain.handle("projects:getSuppliers", async (_event, projectId: string) => {
    try {
      const links = await getPrismaClient().projectSupplier.findMany({
        where: { projectId },
        include: { supplier: true },
        orderBy: { orderIndex: "asc" },
      });
      return {
        success: true,
        data: links.map(({ supplier }) => ({ ...supplier, projects: [] })),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch project suppliers",
      };
    }
  });

  ipcMain.handle(
    "projects:setSuppliers",
    async (_event, projectId: string, supplierIds: string[]) => {
      try {
        const prisma = getPrismaClient();
        await prisma.$transaction(async (tx) => {
          await tx.projectSupplier.deleteMany({ where: { projectId } });
          for (const [orderIndex, supplierId] of [
            ...new Set(supplierIds),
          ].entries())
            await tx.projectSupplier.create({
              data: { projectId, supplierId, orderIndex },
            });
        });
        return { success: true, data: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update project suppliers",
        };
      }
    },
  );

  ipcMain.handle(
    "projects:addSupplier",
    async (_event, projectId: string, supplierId: string) => {
      try {
        await getPrismaClient().projectSupplier.upsert({
          where: { projectId_supplierId: { projectId, supplierId } },
          update: {},
          create: {
            projectId,
            supplierId,
            orderIndex: await getPrismaClient().projectSupplier.count({
              where: { projectId },
            }),
          },
        });
        return { success: true, data: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to associate supplier.",
        };
      }
    },
  );

  ipcMain.handle(
    "projects:createSupplier",
    async (_event, projectId: string, rawName: string) => {
      try {
        const name = typeof rawName === "string" ? rawName.trim() : "";
        if (name.length < 2)
          throw new Error("Supplier name must have at least 2 characters.");
        const prisma = getPrismaClient();
        const created = await prisma.$transaction(async (tx) => {
          const duplicate = await tx.supplier.findMany({
            select: { id: true, name: true },
          });
          if (
            duplicate.some(
              (supplier) =>
                supplier.name.trim().toLocaleLowerCase() ===
                name.toLocaleLowerCase(),
            )
          )
            throw new Error("A supplier with this name already exists.");
          const supplier = await tx.supplier.create({ data: { name } });
          await tx.projectSupplier.create({
            data: {
              projectId,
              supplierId: supplier.id,
              orderIndex: await tx.projectSupplier.count({
                where: { projectId },
              }),
            },
          });
          return supplier;
        });
        return { success: true, data: { id: created.id, name: created.name } };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create supplier.",
        };
      }
    },
  );

  ipcMain.handle(
    "excel:selectMatrix",
    async (_event, projectId: string, language: "es" | "en") => {
      try {
        const project = await getPrismaClient().project.findUnique({
          where: { id: projectId },
          include: {
            suppliers: {
              include: { supplier: { select: { id: true, name: true } } },
              orderBy: { orderIndex: "asc" },
            },
          },
        });
        if (!project) return { success: false, error: "Project not found." };
        const selection = await dialog.showOpenDialog(mainWindow, {
          title: "Import Excel matrix",
          properties: ["openFile"],
          filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
        });
        if (selection.canceled || !selection.filePaths[0])
          return { success: true, data: null };
        const filePath = selection.filePaths[0];
        const stat = fs.statSync(filePath);
        if (stat.size > 30 * 1024 * 1024)
          return {
            success: false,
            error: "The Excel file exceeds the 30 MB limit.",
          };
        const preview = parseExcelMatrix(
          fs.readFileSync(filePath),
          language === "en" ? "en" : "es",
        );
        return {
          success: true,
          data: {
            fileName: filePath.split(/[\\/]/).pop() || "matrix.xlsx",
            preview,
            suppliers: project.suppliers.map(({ supplier }) => supplier),
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not read the Excel file.",
        };
      }
    },
  );

  ipcMain.handle(
    "excel:importMatrix",
    async (
      _event,
      projectId: string,
      rows: ImportedBudgetRow[],
      supplierIds: string[],
    ) => {
      try {
        const importedCount = await importExcelRows(
          getPrismaClient(),
          projectId,
          rows,
          supplierIds,
        );
        return { success: true, data: { importedCount } };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "The Excel import failed.",
        };
      }
    },
  );

  const validateItemData = (data: {
    itemNumber: string;
    description: string;
    quantity: number;
    unit: string;
  }) => {
    if (!data || typeof data.itemNumber !== "string" || !data.itemNumber.trim())
      throw new Error("ITEM is required.");
    if (typeof data.description !== "string" || !data.description.trim())
      throw new Error("Description is required.");
    if (!Number.isFinite(data.quantity) || data.quantity < 0)
      throw new Error("Quantity must be a non-negative number.");
    if (typeof data.unit !== "string" || !data.unit.trim())
      throw new Error("Unit is required.");
  };
  const itemFields = (data: {
    itemNumber: string;
    description: string;
    quantity: number;
    unit: string;
  }) => ({
    itemNumber: data.itemNumber.trim(),
    description: data.description.trim(),
    quantity: data.quantity,
    unit: data.unit.trim(),
  });

  ipcMain.handle(
    "items:create",
    async (
      _event,
      projectId: string,
      data: {
        itemNumber: string;
        description: string;
        quantity: number;
        unit: string;
      },
    ) => {
      try {
        validateItemData(data);
        const prisma = getPrismaClient();
        const existingItems = await prisma.budgetItem.findMany({
          where: { projectId },
          select: { itemNumber: true },
        });
        const duplicate = existingItems.some(
          (item) =>
            item.itemNumber.trim().toLocaleLowerCase() ===
            data.itemNumber.trim().toLocaleLowerCase(),
        );
        if (duplicate)
          throw new Error(
            "An item with this ITEM already exists in the project.",
          );
        const created = await prisma.budgetItem.create({
          data: {
            projectId,
            ...itemFields(data),
            orderIndex: await prisma.budgetItem.count({ where: { projectId } }),
          },
          include: { quotes: { include: { supplier: true } } },
        });
        return { success: true, data: { ...created, quotes: [] } };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create item.",
        };
      }
    },
  );

  ipcMain.handle(
    "items:update",
    async (
      _event,
      projectId: string,
      itemId: string,
      data: {
        itemNumber: string;
        description: string;
        quantity: number;
        unit: string;
      },
    ) => {
      try {
        validateItemData(data);
        const prisma = getPrismaClient();
        const existingItems = await prisma.budgetItem.findMany({
          where: { projectId, id: { not: itemId } },
          select: { itemNumber: true },
        });
        const duplicate = existingItems.some(
          (item) =>
            item.itemNumber.trim().toLocaleLowerCase() ===
            data.itemNumber.trim().toLocaleLowerCase(),
        );
        if (duplicate)
          throw new Error(
            "An item with this ITEM already exists in the project.",
          );
        const updated = await prisma.budgetItem.update({
          where: { id: itemId, projectId },
          data: itemFields(data),
        });
        return { success: true, data: { ...updated, quotes: [] } };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update item.",
        };
      }
    },
  );

  ipcMain.handle(
    "items:delete",
    async (_event, projectId: string, itemId: string) => {
      try {
        const prisma = getPrismaClient();
        const deleted = await prisma.budgetItem.deleteMany({
          where: { id: itemId, projectId },
        });
        if (!deleted.count)
          throw new Error("Budget item not found in this project.");
        return { success: true, data: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete item.",
        };
      }
    },
  );

  ipcMain.handle(
    "quotes:save",
    async (
      _event,
      projectId: string,
      itemId: string,
      supplierId: string,
      data: { unitPrice: number | null; totalPrice: number | null },
    ) => {
      try {
        if (!data || (data.unitPrice === null && data.totalPrice === null))
          throw new Error("Enter at least one quote price.");
        for (const price of [data.unitPrice, data.totalPrice])
          if (price !== null && (!Number.isFinite(price) || price < 0))
            throw new Error("Prices must be non-negative numbers.");
        const prisma = getPrismaClient();
        const [item, association] = await Promise.all([
          prisma.budgetItem.findFirst({ where: { id: itemId, projectId } }),
          prisma.projectSupplier.findUnique({
            where: { projectId_supplierId: { projectId, supplierId } },
          }),
        ]);
        if (!item) throw new Error("Budget item not found in this project.");
        if (!association)
          throw new Error("Supplier must be associated with this project.");
        const missing = [
          data.unitPrice === null ? "unit price" : "",
          data.totalPrice === null ? "total price" : "",
        ].filter(Boolean);
        const notes = missing.length
          ? `Empty ${missing.join(" and ")} in manually entered quote.`
          : null;
        const quote = await prisma.itemQuote.upsert({
          where: { itemId_supplierId: { itemId, supplierId } },
          update: {
            unitPrice: data.unitPrice ?? 0,
            totalPrice: data.totalPrice ?? 0,
            notes,
          },
          create: {
            itemId,
            supplierId,
            unitPrice: data.unitPrice ?? 0,
            totalPrice: data.totalPrice ?? 0,
            notes,
          },
        });
        const warning =
          data.unitPrice !== null &&
          data.totalPrice !== null &&
          Math.abs(data.totalPrice - item.quantity * data.unitPrice) >
            Math.max(0.01, Math.abs(data.totalPrice) * 0.001);
        return { success: true, data: { id: quote.id, warning } };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to save quote.",
        };
      }
    },
  );

  ipcMain.handle(
    "quotes:delete",
    async (_event, projectId: string, itemId: string, supplierId: string) => {
      try {
        const result = await getPrismaClient().itemQuote.deleteMany({
          where: { itemId, supplierId, budgetItem: { projectId } },
        });
        if (!result.count) throw new Error("Quote not found.");
        return { success: true, data: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete quote.",
        };
      }
    },
  );

  ipcMain.handle("projects:getItems", async (_event, projectId: string) => {
    try {
      const items = await getPrismaClient().budgetItem.findMany({
        where: { projectId },
        orderBy: { orderIndex: "asc" },
        include: {
          quotes: {
            include: { supplier: { select: { id: true, name: true } } },
          },
        },
      });
      return {
        success: true,
        data: items.map(({ quotes, ...item }) => ({
          ...item,
          quotes: quotes.map(({ supplier, ...quote }) => ({
            ...quote,
            supplierId: supplier.id,
            supplierName: supplier.name,
          })),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to read project items.",
      };
    }
  });
}
