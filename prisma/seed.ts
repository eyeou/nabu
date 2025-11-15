import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

const fakeTeachers = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@naboo.edu',
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@naboo.edu',
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@naboo.edu',
  },
  {
    name: 'David Kim',
    email: 'david.kim@naboo.edu',
  },
  {
    name: 'Jessica Williams',
    email: 'jessica.williams@naboo.edu',
  },
  {
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@naboo.edu',
  },
  {
    name: 'Maria Garcia',
    email: 'maria.garcia@naboo.edu',
  },
  {
    name: 'James Thompson',
    email: 'james.thompson@naboo.edu',
  },
  {
    name: 'Priya Patel',
    email: 'priya.patel@naboo.edu',
  },
  {
    name: 'Robert Anderson',
    email: 'robert.anderson@naboo.edu',
  },
  {
    name: 'Lisa Zhang',
    email: 'lisa.zhang@naboo.edu',
  },
  {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@naboo.edu',
  },
  {
    name: 'Aisha Okafor',
    email: 'aisha.okafor@naboo.edu',
  },
  {
    name: 'Daniel O\'Connor',
    email: 'daniel.oconnor@naboo.edu',
  },
  {
    name: 'Fatima Al-Rashid',
    email: 'fatima.alrashid@naboo.edu',
  }
];

async function main() {
  console.log('🌱 Starting to seed fake teacher profiles...');

  // Check if teachers already exist
  const existingTeachers = await prisma.teacher.findMany();
  if (existingTeachers.length > 0) {
    console.log(`⚠️  Found ${existingTeachers.length} existing teachers. Skipping seed to avoid duplicates.`);
    console.log('💡 To re-seed, first clear the teachers table or use a different approach.');
    return;
  }

  // Hash the default password for all fake teachers
  const defaultPassword = 'password123';
  const hashedPassword = await hashPassword(defaultPassword);

  // Create fake teachers
  const createdTeachers = [];
  for (const teacherData of fakeTeachers) {
    try {
      const teacher = await prisma.teacher.create({
        data: {
          name: teacherData.name,
          email: teacherData.email,
          passwordHash: hashedPassword,
        },
      });
      createdTeachers.push(teacher);
      console.log(`✅ Created teacher: ${teacher.name} (${teacher.email})`);
    } catch (error) {
      console.error(`❌ Failed to create teacher ${teacherData.name}:`, error);
    }
  }

  console.log(`\n🎉 Successfully created ${createdTeachers.length} fake teacher profiles!`);
  console.log('\n📝 Login credentials for all teachers:');
  console.log('   Password: password123');
  console.log('\n📧 Teacher emails:');
  createdTeachers.forEach((teacher, index) => {
    console.log(`   ${index + 1}. ${teacher.email}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });