-- CreateEnum
CREATE TYPE "MaterialAvailability" AS ENUM ('AVAILABLE', 'LIMITED_STOCK', 'SPECIAL_ORDER', 'DISCONTINUED', 'OBSOLETE');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('MANUFACTURER', 'DISTRIBUTOR', 'SUPPLIER', 'FABRICATOR', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "ProjectMaterialStatus" AS ENUM ('SPECIFIED', 'APPROVED', 'ORDERED', 'IN_TRANSIT', 'DELIVERED', 'INSTALLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MaterialApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW');

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "csiDivision" TEXT,
    "csiSection" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "iconName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "productLine" TEXT,
    "modelNumber" TEXT,
    "sku" TEXT,
    "categoryId" TEXT NOT NULL,
    "csiDivision" TEXT,
    "csiSection" TEXT,
    "unitCost" DECIMAL(12,4),
    "unitOfMeasure" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priceDate" TIMESTAMP(3),
    "priceSource" TEXT,
    "leadTimeDays" INTEGER,
    "availabilityStatus" "MaterialAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "minimumOrderQuantity" DECIMAL(10,2),
    "structuralProperties" JSONB,
    "thermalProperties" JSONB,
    "acousticProperties" JSONB,
    "fireRatings" JSONB,
    "sustainabilityMetrics" JSONB,
    "buildingCodeCompliant" BOOLEAN NOT NULL DEFAULT false,
    "certifications" TEXT[],
    "approvalRegions" TEXT[],
    "dataSheetUrl" TEXT,
    "installationGuideUrl" TEXT,
    "warrantyInfo" TEXT,
    "expectedLifespan" INTEGER,
    "maintenanceNotes" TEXT,
    "primaryVendorId" TEXT,
    "alternativeVendorIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPriceHistory" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "vendorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "website" TEXT,
    "vendorType" "VendorType" NOT NULL,
    "specialties" TEXT[],
    "serviceRegions" TEXT[],
    "paymentTerms" TEXT,
    "shippingPolicy" TEXT,
    "returnPolicy" TEXT,
    "reliabilityScore" DECIMAL(3,2),
    "averageLeadTime" INTEGER,
    "onTimeDeliveryRate" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMaterial" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "location" TEXT,
    "specSection" TEXT,
    "status" "ProjectMaterialStatus" NOT NULL DEFAULT 'SPECIFIED',
    "approvalStatus" "MaterialApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "budgetedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "installDate" TIMESTAMP(3),
    "installedBy" TEXT,
    "isSubstitution" BOOLEAN NOT NULL DEFAULT false,
    "originalMaterialId" TEXT,
    "substitutionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ProjectMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSpecification" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "projectId" TEXT,
    "specSection" TEXT NOT NULL,
    "specTitle" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "performanceCriteria" TEXT,
    "testingRequired" BOOLEAN NOT NULL DEFAULT false,
    "testingStandards" TEXT[],
    "qualityControlNotes" TEXT,
    "submittalRequired" BOOLEAN NOT NULL DEFAULT true,
    "sampleRequired" BOOLEAN NOT NULL DEFAULT false,
    "mockupRequired" BOOLEAN NOT NULL DEFAULT false,
    "installationMethod" TEXT,
    "specialInstructions" TEXT,
    "warrantyPeriod" INTEGER,
    "warrantyType" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "MaterialSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSubstitution" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalMaterialId" TEXT NOT NULL,
    "substituteMaterialId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MaterialApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewDate" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "costDifference" DECIMAL(12,2),
    "impactsSchedule" BOOLEAN NOT NULL DEFAULT false,
    "scheduleDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectType" TEXT,
    "buildingType" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "MaterialTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialTemplateMaterial" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "location" TEXT,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialTemplateMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_name_key" ON "MaterialCategory"("name");
CREATE INDEX "MaterialCategory_parentId_idx" ON "MaterialCategory"("parentId");
CREATE INDEX "MaterialCategory_csiDivision_csiSection_idx" ON "MaterialCategory"("csiDivision", "csiSection");

-- CreateIndex
CREATE INDEX "Material_categoryId_idx" ON "Material"("categoryId");
CREATE INDEX "Material_manufacturer_idx" ON "Material"("manufacturer");
CREATE INDEX "Material_csiDivision_csiSection_idx" ON "Material"("csiDivision", "csiSection");
CREATE INDEX "Material_availabilityStatus_idx" ON "Material"("availabilityStatus");
CREATE INDEX "Material_isActive_idx" ON "Material"("isActive");
CREATE INDEX "Material_createdById_idx" ON "Material"("createdById");

-- CreateIndex
CREATE INDEX "MaterialPriceHistory_materialId_effectiveDate_idx" ON "MaterialPriceHistory"("materialId", "effectiveDate");
CREATE INDEX "MaterialPriceHistory_vendorId_idx" ON "MaterialPriceHistory"("vendorId");

-- CreateIndex
CREATE INDEX "Vendor_vendorType_idx" ON "Vendor"("vendorType");
CREATE INDEX "Vendor_isActive_isPreferred_idx" ON "Vendor"("isActive", "isPreferred");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMaterial_projectId_materialId_location_key" ON "ProjectMaterial"("projectId", "materialId", "location");
CREATE INDEX "ProjectMaterial_projectId_idx" ON "ProjectMaterial"("projectId");
CREATE INDEX "ProjectMaterial_materialId_idx" ON "ProjectMaterial"("materialId");
CREATE INDEX "ProjectMaterial_status_idx" ON "ProjectMaterial"("status");
CREATE INDEX "ProjectMaterial_approvalStatus_idx" ON "ProjectMaterial"("approvalStatus");
CREATE INDEX "ProjectMaterial_createdById_idx" ON "ProjectMaterial"("createdById");

-- CreateIndex
CREATE INDEX "MaterialSpecification_materialId_idx" ON "MaterialSpecification"("materialId");
CREATE INDEX "MaterialSpecification_projectId_idx" ON "MaterialSpecification"("projectId");
CREATE INDEX "MaterialSpecification_specSection_idx" ON "MaterialSpecification"("specSection");
CREATE INDEX "MaterialSpecification_createdById_idx" ON "MaterialSpecification"("createdById");

-- CreateIndex
CREATE INDEX "MaterialSubstitution_projectId_idx" ON "MaterialSubstitution"("projectId");
CREATE INDEX "MaterialSubstitution_status_idx" ON "MaterialSubstitution"("status");

-- CreateIndex
CREATE INDEX "MaterialTemplate_projectType_idx" ON "MaterialTemplate"("projectType");
CREATE INDEX "MaterialTemplate_createdById_idx" ON "MaterialTemplate"("createdById");
CREATE INDEX "MaterialTemplate_isPublic_idx" ON "MaterialTemplate"("isPublic");

-- CreateIndex
CREATE INDEX "MaterialTemplateMaterial_templateId_idx" ON "MaterialTemplateMaterial"("templateId");
CREATE INDEX "MaterialTemplateMaterial_materialId_idx" ON "MaterialTemplateMaterial"("materialId");

-- AddForeignKey
ALTER TABLE "MaterialCategory" ADD CONSTRAINT "MaterialCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Material" ADD CONSTRAINT "Material_primaryVendorId_fkey" FOREIGN KEY ("primaryVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Material" ADD CONSTRAINT "Material_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPriceHistory" ADD CONSTRAINT "MaterialPriceHistory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialPriceHistory" ADD CONSTRAINT "MaterialPriceHistory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMaterial" ADD CONSTRAINT "ProjectMaterial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMaterial" ADD CONSTRAINT "ProjectMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectMaterial" ADD CONSTRAINT "ProjectMaterial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSpecification" ADD CONSTRAINT "MaterialSpecification_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialSpecification" ADD CONSTRAINT "MaterialSpecification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialSpecification" ADD CONSTRAINT "MaterialSpecification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSubstitution" ADD CONSTRAINT "MaterialSubstitution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialSubstitution" ADD CONSTRAINT "MaterialSubstitution_originalMaterialId_fkey" FOREIGN KEY ("originalMaterialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialSubstitution" ADD CONSTRAINT "MaterialSubstitution_substituteMaterialId_fkey" FOREIGN KEY ("substituteMaterialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTemplate" ADD CONSTRAINT "MaterialTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTemplateMaterial" ADD CONSTRAINT "MaterialTemplateMaterial_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaterialTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialTemplateMaterial" ADD CONSTRAINT "MaterialTemplateMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
