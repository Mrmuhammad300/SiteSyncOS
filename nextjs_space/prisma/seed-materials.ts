import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMaterialLibrary() {
  console.log('Seeding Material Library...');

  // Create Material Categories
  console.log('Creating material categories...');

  const structural = await prisma.materialCategory.create({
    data: {
      name: 'Structural',
      description: 'Structural systems and load-bearing components',
      csiDivision: '05',
      displayOrder: 1,
      iconName: 'Building2',
    },
  });

  const steel = await prisma.materialCategory.create({
    data: {
      name: 'Steel',
      description: 'Structural steel products',
      parentId: structural.id,
      csiDivision: '05',
      csiSection: '05 12 00',
      displayOrder: 1,
      iconName: 'Boxes',
    },
  });

  const concrete = await prisma.materialCategory.create({
    data: {
      name: 'Concrete',
      description: 'Concrete and concrete products',
      parentId: structural.id,
      csiDivision: '03',
      csiSection: '03 30 00',
      displayOrder: 2,
      iconName: 'Box',
    },
  });

  const envelope = await prisma.materialCategory.create({
    data: {
      name: 'Building Envelope',
      description: 'Exterior enclosure systems',
      csiDivision: '07',
      displayOrder: 2,
      iconName: 'Home',
    },
  });

  const facade = await prisma.materialCategory.create({
    data: {
      name: 'Facade',
      description: 'Exterior wall systems and cladding',
      parentId: envelope.id,
      csiDivision: '07',
      csiSection: '07 40 00',
      displayOrder: 1,
      iconName: 'Warehouse',
    },
  });

  const glazing = await prisma.materialCategory.create({
    data: {
      name: 'Glazing',
      description: 'Glass and glazing systems',
      parentId: envelope.id,
      csiDivision: '08',
      csiSection: '08 80 00',
      displayOrder: 2,
      iconName: 'Square',
    },
  });

  const roofing = await prisma.materialCategory.create({
    data: {
      name: 'Roofing',
      description: 'Roofing systems and membranes',
      parentId: envelope.id,
      csiDivision: '07',
      csiSection: '07 50 00',
      displayOrder: 3,
      iconName: 'Triangle',
    },
  });

  const finishes = await prisma.materialCategory.create({
    data: {
      name: 'Interior Finishes',
      description: 'Interior finish materials',
      csiDivision: '09',
      displayOrder: 3,
      iconName: 'Paintbrush',
    },
  });

  // Create Vendors
  console.log('Creating vendors...');

  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'Nucor Steel',
      companyName: 'Nucor Corporation',
      vendorType: 'MANUFACTURER',
      specialties: ['Structural Steel', 'Metal Decking'],
      serviceRegions: ['National'],
      email: 'sales@nucor.com',
      phone: '1-800-NUCOR-01',
      website: 'https://www.nucor.com',
      isActive: true,
      isPreferred: true,
      reliabilityScore: 4.8,
      averageLeadTime: 14,
      onTimeDeliveryRate: 95.5,
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: 'GAF Materials',
      companyName: 'GAF Materials Corporation',
      vendorType: 'MANUFACTURER',
      specialties: ['Roofing', 'Waterproofing'],
      serviceRegions: ['National'],
      email: 'info@gaf.com',
      phone: '1-800-ROOF-GAF',
      website: 'https://www.gaf.com',
      isActive: true,
      isPreferred: true,
      reliabilityScore: 4.7,
      averageLeadTime: 7,
      onTimeDeliveryRate: 92.0,
    },
  });

  const vendor3 = await prisma.vendor.create({
    data: {
      name: 'James Hardie',
      companyName: 'James Hardie Building Products',
      vendorType: 'MANUFACTURER',
      specialties: ['Fiber Cement Siding', 'Exterior Cladding'],
      serviceRegions: ['National'],
      email: 'contact@jameshardie.com',
      phone: '1-866-4HARDIE',
      website: 'https://www.jameshardie.com',
      isActive: true,
      isPreferred: true,
      reliabilityScore: 4.6,
      averageLeadTime: 10,
      onTimeDeliveryRate: 90.0,
    },
  });

  const vendor4 = await prisma.vendor.create({
    data: {
      name: 'Guardian Glass',
      companyName: 'Guardian Industries',
      vendorType: 'MANUFACTURER',
      specialties: ['Architectural Glass', 'Energy-Efficient Glazing'],
      serviceRegions: ['National', 'International'],
      email: 'glass@guardian.com',
      phone: '1-866-482-7346',
      website: 'https://www.guardianglass.com',
      isActive: true,
      isPreferred: false,
      reliabilityScore: 4.5,
      averageLeadTime: 21,
      onTimeDeliveryRate: 88.0,
    },
  });

  // Create Materials
  console.log('Creating materials...');

  await prisma.material.create({
    data: {
      name: 'W12x26 Wide Flange Beam',
      description: 'ASTM A992 Grade 50 structural steel wide flange beam, hot-rolled',
      manufacturer: 'Nucor Steel',
      productLine: 'Structural Shapes',
      modelNumber: 'W12x26',
      sku: 'NUC-W12X26',
      categoryId: steel.id,
      csiDivision: '05',
      csiSection: '05 12 00',
      unitCost: 1850.0,
      unitOfMeasure: 'TON',
      currency: 'USD',
      priceDate: new Date(),
      priceSource: 'Manufacturer Quote',
      leadTimeDays: 14,
      availabilityStatus: 'AVAILABLE',
      minimumOrderQuantity: 1.0,
      structuralProperties: {
        depth: 12.22,
        flangeWidth: 6.49,
        webThickness: 0.23,
        flangeThickness: 0.38,
        weight: 26,
        section: { Ix: 204, Sx: 33.4, rx: 5.17, Zx: 37.2 },
        material: { yield: 50, tensile: 65 },
      },
      buildingCodeCompliant: true,
      certifications: ['ASTM A992', 'AISC 360', 'AWS D1.1'],
      approvalRegions: ['National'],
      dataSheetUrl: 'https://example.com/datasheets/w12x26.pdf',
      warrantyInfo: 'Standard steel warranty, corrosion protection as specified',
      expectedLifespan: 100,
      primaryVendorId: vendor1.id,
      isActive: true,
      tags: ['structural', 'steel', 'beam', 'wide-flange'],
    },
  });

  await prisma.material.create({
    data: {
      name: 'TPO Roofing Membrane 60 mil',
      description: 'White TPO single-ply roofing membrane with fleece backing',
      manufacturer: 'GAF Materials',
      productLine: 'EverGuard TPO',
      modelNumber: 'EG060-WHITE',
      sku: 'GAF-TPO-060',
      categoryId: roofing.id,
      csiDivision: '07',
      csiSection: '07 54 00',
      unitCost: 0.95,
      unitOfMeasure: 'SF',
      priceDate: new Date(),
      leadTimeDays: 7,
      availabilityStatus: 'AVAILABLE',
      thermalProperties: {
        solarReflectance: 0.85,
        thermalEmittance: 0.87,
        sri: 105,
      },
      sustainabilityMetrics: {
        recycledContent: 0,
        recyclable: true,
        energyStar: true,
        coolRoofRated: true,
        leedContribution: 'MR Credit 2, SS Credit 7.2',
      },
      warrantyInfo: '20-year manufacturer NDL warranty',
      expectedLifespan: 25,
      certifications: ['ASTM D6878', 'Energy Star', 'CRRC'],
      buildingCodeCompliant: true,
      primaryVendorId: vendor2.id,
      isActive: true,
      tags: ['roofing', 'tpo', 'single-ply', 'cool-roof'],
    },
  });

  await prisma.material.create({
    data: {
      name: 'Fiber Cement Siding 5/16" x 8.25"',
      description: 'HardiePlank fiber cement lap siding, primed',
      manufacturer: 'James Hardie',
      productLine: 'HardiePlank',
      modelNumber: 'HP-5/16-8.25',
      categoryId: facade.id,
      csiDivision: '07',
      csiSection: '07 46 00',
      unitCost: 1.85,
      unitOfMeasure: 'SF',
      priceDate: new Date(),
      leadTimeDays: 10,
      availabilityStatus: 'AVAILABLE',
      thermalProperties: { rValue: 0.5 },
      fireRatings: {
        flameSpread: 0,
        smokeDeveloped: 0,
        fireRating: 'Class A',
      },
      sustainabilityMetrics: {
        recyclable: false,
        nonCombustible: true,
      },
      warrantyInfo: '30-year limited transferable warranty',
      expectedLifespan: 50,
      maintenanceNotes: 'Requires painting every 10-15 years',
      certifications: ['ASTM C1186', 'ICC-ES ESR-1668'],
      buildingCodeCompliant: true,
      primaryVendorId: vendor3.id,
      isActive: true,
      tags: ['siding', 'fiber-cement', 'exterior'],
    },
  });

  await prisma.material.create({
    data: {
      name: 'Low-E Double Glazed Unit 1" IGU',
      description: 'Low-E coated insulating glass unit, argon filled',
      manufacturer: 'Guardian Glass',
      productLine: 'ClimaGuard',
      modelNumber: 'CG-70/36-1.0',
      categoryId: glazing.id,
      csiDivision: '08',
      csiSection: '08 80 00',
      unitCost: 28.5,
      unitOfMeasure: 'SF',
      priceDate: new Date(),
      leadTimeDays: 21,
      availabilityStatus: 'AVAILABLE',
      thermalProperties: { uFactor: 0.28, shgc: 0.36, vlt: 0.7 },
      acousticProperties: { stc: 32 },
      sustainabilityMetrics: {
        energyStar: true,
        leedContribution: 'EA Credit 1',
      },
      warrantyInfo: '10-year seal warranty',
      expectedLifespan: 30,
      certifications: ['NFRC', 'IGCC', 'Energy Star'],
      buildingCodeCompliant: true,
      primaryVendorId: vendor4.id,
      isActive: true,
      tags: ['glazing', 'glass', 'low-e', 'energy-efficient'],
    },
  });

  console.log('Material Library seeded successfully!');
}

async function main() {
  try {
    await seedMaterialLibrary();
  } catch (error) {
    console.error('Error seeding material library:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
