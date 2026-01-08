import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, DATABASE_VERSION, MOCK_USER } from '../utils/constants';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await createTables(db);
  await runMigrations(db);
  await seedMockUser(db);

  return db;
};

const runMigrations = async (database: SQLite.SQLiteDatabase) => {
  // Check if new columns exist, add them if not (for existing databases)
  try {
    // Check UserWorkoutPlan columns
    const planColumns = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(UserWorkoutPlan)"
    );
    const planColumnNames = planColumns.map(c => c.name);

    if (!planColumnNames.includes('duration_weeks')) {
      await database.execAsync('ALTER TABLE UserWorkoutPlan ADD COLUMN duration_weeks INTEGER NOT NULL DEFAULT 4');
      console.log('Added duration_weeks column');
    }
    if (!planColumnNames.includes('is_active')) {
      await database.execAsync('ALTER TABLE UserWorkoutPlan ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
      console.log('Added is_active column');
    }

    // Check UserWorkoutDay columns
    const dayColumns = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(UserWorkoutDay)"
    );
    const dayColumnNames = dayColumns.map(c => c.name);

    if (!dayColumnNames.includes('week_number')) {
      await database.execAsync('ALTER TABLE UserWorkoutDay ADD COLUMN week_number INTEGER NOT NULL DEFAULT 1');
      console.log('Added week_number column');
    }
    if (!dayColumnNames.includes('day_type_id')) {
      await database.execAsync('ALTER TABLE UserWorkoutDay ADD COLUMN day_type_id INTEGER NOT NULL DEFAULT 0');
      // Set day_type_id to match day_template_id for existing rows
      await database.execAsync('UPDATE UserWorkoutDay SET day_type_id = day_template_id WHERE day_type_id = 0');
      console.log('Added day_type_id column');
    }

    // Create indexes for new columns (safe to run multiple times with IF NOT EXISTS)
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_workout_day_week ON UserWorkoutDay(plan_id, week_number)');
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_workout_plan_active ON UserWorkoutPlan(user_id, is_active)');

    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

const createTables = async (database: SQLite.SQLiteDatabase) => {
  await database.execAsync(`
    -- Reference data (synced from backend)
    CREATE TABLE IF NOT EXISTS Equipment (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS MuscleGroup (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS Exercise (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      video_url TEXT,
      primary_muscle_group_id INTEGER,
      synced_at TEXT,
      FOREIGN KEY (primary_muscle_group_id) REFERENCES MuscleGroup(id)
    );

    CREATE TABLE IF NOT EXISTS ExerciseEquipment (
      exercise_id INTEGER NOT NULL,
      equipment_id INTEGER NOT NULL,
      PRIMARY KEY (exercise_id, equipment_id),
      FOREIGN KEY (exercise_id) REFERENCES Exercise(id),
      FOREIGN KEY (equipment_id) REFERENCES Equipment(id)
    );

    CREATE TABLE IF NOT EXISTS ExerciseSecondaryMuscle (
      exercise_id INTEGER NOT NULL,
      muscle_group_id INTEGER NOT NULL,
      PRIMARY KEY (exercise_id, muscle_group_id),
      FOREIGN KEY (exercise_id) REFERENCES Exercise(id),
      FOREIGN KEY (muscle_group_id) REFERENCES MuscleGroup(id)
    );

    CREATE TABLE IF NOT EXISTS WorkoutTemplate (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_premium INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS WorkoutDayTemplate (
      id INTEGER PRIMARY KEY,
      template_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (template_id) REFERENCES WorkoutTemplate(id)
    );

    CREATE TABLE IF NOT EXISTS WorkoutDayTemplateMuscle (
      day_template_id INTEGER NOT NULL,
      muscle_group_id INTEGER NOT NULL,
      exercise_count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (day_template_id, muscle_group_id),
      FOREIGN KEY (day_template_id) REFERENCES WorkoutDayTemplate(id),
      FOREIGN KEY (muscle_group_id) REFERENCES MuscleGroup(id)
    );

    -- User data (local first, sync to backend)
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT,
      subscription_status TEXT NOT NULL DEFAULT 'free',
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS UserEquipment (
      user_id INTEGER NOT NULL,
      equipment_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, equipment_id),
      FOREIGN KEY (user_id) REFERENCES User(id),
      FOREIGN KEY (equipment_id) REFERENCES Equipment(id)
    );

    CREATE TABLE IF NOT EXISTS UserWorkoutPlan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL DEFAULT 4,
      is_active INTEGER NOT NULL DEFAULT 1,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES User(id),
      FOREIGN KEY (template_id) REFERENCES WorkoutTemplate(id)
    );

    CREATE TABLE IF NOT EXISTS UserWorkoutDay (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      week_number INTEGER NOT NULL DEFAULT 1,
      day_type_id INTEGER NOT NULL,
      day_template_id INTEGER NOT NULL,
      scheduled_date TEXT,
      completed_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (plan_id) REFERENCES UserWorkoutPlan(id),
      FOREIGN KEY (day_template_id) REFERENCES WorkoutDayTemplate(id)
    );

    CREATE TABLE IF NOT EXISTS UserExerciseLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_day_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (workout_day_id) REFERENCES UserWorkoutDay(id),
      FOREIGN KEY (exercise_id) REFERENCES Exercise(id)
    );

    CREATE TABLE IF NOT EXISTS ExerciseSet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_log_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      target_reps INTEGER NOT NULL,
      actual_reps INTEGER,
      weight REAL,
      completed INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (exercise_log_id) REFERENCES UserExerciseLog(id)
    );

    -- Sync tracking
    CREATE TABLE IF NOT EXISTS SyncQueue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for common queries (only base columns - new column indexes added in migrations)
    CREATE INDEX IF NOT EXISTS idx_user_equipment ON UserEquipment(user_id);
    CREATE INDEX IF NOT EXISTS idx_workout_day_plan ON UserWorkoutDay(plan_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_log_day ON UserExerciseLog(workout_day_id);
    CREATE INDEX IF NOT EXISTS idx_set_log ON ExerciseSet(exercise_log_id);
  `);

  console.log('Database tables created successfully');
};

const seedMockUser = async (database: SQLite.SQLiteDatabase) => {
  const result = await database.getFirstAsync('SELECT id FROM User WHERE id = 1');

  if (!result) {
    await database.runAsync(
      'INSERT INTO User (id, email, display_name, subscription_status, sync_status) VALUES (?, ?, ?, ?, ?)',
      [MOCK_USER.id, MOCK_USER.email, MOCK_USER.displayName, MOCK_USER.subscriptionStatus, 'synced']
    );
    console.log('Mock user seeded');
  }
};
