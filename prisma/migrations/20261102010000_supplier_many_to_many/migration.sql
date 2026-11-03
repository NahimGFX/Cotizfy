-- Preserve existing supplier IDs and quote links while moving project ownership
-- into an explicit many-to-many relation.
PRAGMA foreign_keys=OFF;
CREATE TABLE "ProjectSupplier" (
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectSupplier_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("projectId", "supplierId")
);
INSERT INTO "ProjectSupplier" ("projectId", "supplierId", "orderIndex") SELECT "projectId", "id", "orderIndex" FROM "Supplier";
CREATE INDEX "ProjectSupplier_supplierId_idx" ON "ProjectSupplier"("supplierId");
CREATE TABLE "Supplier_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "Supplier_new" ("id", "name", "contact", "email", "phone", "color", "createdAt", "updatedAt") SELECT "id", "name", "contact", "email", "phone", "color", "createdAt", "updatedAt" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "Supplier_new" RENAME TO "Supplier";
PRAGMA foreign_keys=ON;
