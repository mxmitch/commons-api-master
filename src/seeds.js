const db = require('./db'); // Adjust the path to your DB connection file

async function seedCategories() {
  console.log('Seeding Data...');

  // Make sure to run this only in development
  if (process.env.NODE_ENV !== 'development') {
    console.log('Development seeds only (for now)!');
    return;
  }

  console.log('Creating Categories...');

  // Clear the existing categories
  await db.query('TRUNCATE TABLE categories RESTART IDENTITY;');

  // Insert new categories
  const categories = [
    { id: 1, name: 'Agriculture, environment, fisheries and natural resources', uclassify_class: 'agriculture_environment' },
    { id: 2, name: 'Arts, culture and entertainment', uclassify_class: 'arts_culture' },
    { id: 3, name: 'Business, industry and trade', uclassify_class: 'business_industry' },
    { id: 4, name: 'Economics and finance', uclassify_class: 'economics_finance' },
    { id: 5, name: 'Education, language and training', uclassify_class: 'education_language' },
    { id: 6, name: 'Employment and labour', uclassify_class: 'employment_labour' },
    { id: 7, name: 'Government, Parliament and politics', uclassify_class: 'government_politics' },
    { id: 8, name: 'Health and safety', uclassify_class: 'health_safety' },
    { id: 9, name: 'Indigenous affairs', uclassify_class: 'indigenous_affairs' },
    { id: 10, name: 'Information and communications', uclassify_class: 'information_communications' },
    { id: 11, name: 'International affairs and defence', uclassify_class: 'international_affairs' },
    { id: 12, name: 'Law, justice and rights', uclassify_class: 'law_justice' },
    { id: 13, name: 'Science and technology', uclassify_class: 'science_technology' },
    { id: 14, name: 'Social affairs and population', uclassify_class: 'social_affairs' },
  ];

  for (const category of categories) {
    await db.query(
      'INSERT INTO categories (id, name, uclassify_class) VALUES ($1, $2, $3)',
      [category.id, category.name, category.uclassify_class]
    );
  }

  console.log('Database Seeded!');
}

seedCategories().catch((err) => console.error('Error seeding categories:', err));
