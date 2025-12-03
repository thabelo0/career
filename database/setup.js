import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
});

const setupDatabase = async () => {
  try {
    console.log('🔧 Setting up database...');

    // Connect to MySQL
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else {
          console.log('✅ Connected to MySQL');
          resolve();
        }
      });
    });

    // Create database
    await new Promise((resolve, reject) => {
      connection.query('CREATE DATABASE IF NOT EXISTS career_guidance', (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Database created or already exists');
          resolve();
        }
      });
    });

    // Use database
    await new Promise((resolve, reject) => {
      connection.query('USE career_guidance', (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Using career_guidance database');
          resolve();
        }
      });
    });

    // Create tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type ENUM('student', 'institute', 'admin') NOT NULL,
        is_verified BOOLEAN DEFAULT TRUE,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_user_type (user_type)
      )`,

      `CREATE TABLE IF NOT EXISTS institutes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        website VARCHAR(255),
        established_year INT,
        accreditation VARCHAR(255),
        total_students INT DEFAULT 0,
        logo_url VARCHAR(500),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_institute (user_id),
        INDEX idx_location (location)
      )`,

      `CREATE TABLE IF NOT EXISTS students (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        date_of_birth DATE,
        phone VARCHAR(20),
        address TEXT,
        high_school VARCHAR(255),
        graduation_year INT,
        grades JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_student (user_id)
      )`,

      `CREATE TABLE IF NOT EXISTS faculties (
        id INT PRIMARY KEY AUTO_INCREMENT,
        institute_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        dean_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        established_year INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
        INDEX idx_institute_id (institute_id),
        INDEX idx_name (name)
      )`,

      `CREATE TABLE IF NOT EXISTS courses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        duration INT,
        duration_unit ENUM('years', 'semesters', 'months') DEFAULT 'years',
        requirements JSON,
        fees JSON,
        intake_capacity INT,
        application_deadline DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE CASCADE,
        INDEX idx_faculty_id (faculty_id),
        INDEX idx_code (code),
        INDEX idx_is_active (is_active),
        INDEX idx_application_deadline (application_deadline)
      )`,

      `CREATE TABLE IF NOT EXISTS admission_periods (
        id INT PRIMARY KEY AUTO_INCREMENT,
        institute_id INT,
        name VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('active', 'closed', 'upcoming') DEFAULT 'upcoming',
        total_applications INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
        INDEX idx_institute_status (institute_id, status)
      )`,

      `CREATE TABLE IF NOT EXISTS applications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT,
        course_id INT,
        institute_id INT,
        admission_period_id INT,
        preferred_major VARCHAR(255),
        personal_statement TEXT,
        status ENUM('pending', 'under_review', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending',
        application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        review_notes TEXT,
        documents JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
        FOREIGN KEY (admission_period_id) REFERENCES admission_periods(id) ON DELETE SET NULL,
        UNIQUE KEY unique_student_course_period (student_id, course_id, admission_period_id),
        INDEX idx_status (status),
        INDEX idx_student (student_id),
        INDEX idx_course (course_id)
      )`,

      `CREATE TABLE IF NOT EXISTS student_institute_applications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        institute_id INT NOT NULL,
        academic_year INT NOT NULL,
        application_count INT DEFAULT 0,
        courses_applied JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_institute_year (student_id, institute_id, academic_year)
      )`
    ];

    // Execute table creation
    for (let i = 0; i < tables.length; i++) {
      await new Promise((resolve, reject) => {
        connection.query(tables[i], (err) => {
          if (err) reject(err);
          else {
            console.log(`✅ Table ${i + 1} created`);
            resolve();
          }
        });
      });
    }

    // Create default admin user
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('admin123', 10);
    
    await new Promise((resolve, reject) => {
      connection.query(
        'INSERT IGNORE INTO users (name, email, password, user_type, is_verified) VALUES (?, ?, ?, "admin", TRUE)',
        ['System Admin', 'admin@careerguide.com', hashedPassword],
        (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Default admin user created');
            resolve();
          }
        }
      );
    });

    // Insert sample data for testing institute management
    console.log('📊 Inserting sample data...');

    // Sample institute user
    const institutePassword = await bcrypt.default.hash('institute123', 10);
    await new Promise((resolve, reject) => {
      connection.query(
        `INSERT IGNORE INTO users (name, email, password, user_type, is_verified) 
         VALUES (?, ?, ?, 'institute', TRUE)`,
        ['University Admin', 'university@edu.com', institutePassword],
        (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Sample institute user created');
            resolve();
          }
        }
      );
    });

    // Sample institute
    await new Promise((resolve, reject) => {
      connection.query(
        `INSERT IGNORE INTO institutes 
         (user_id, name, description, location, contact_email, contact_phone, website, established_year, accreditation, total_students, address) 
         VALUES (2, 'University of Technology', 'Premier institution for engineering and technology education', 'New York', 'info@unitech.edu', '+1-555-0123', 'https://unitech.edu', 1985, 'ABET Accredited', 15000, '123 Tech Avenue, New York, NY 10001')`,
        (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Sample institute created');
            resolve();
          }
        }
      );
    });

    // Sample faculties
    await new Promise((resolve, reject) => {
      connection.query(
        `INSERT IGNORE INTO faculties 
         (institute_id, name, description, dean_name, contact_email, contact_phone, established_year) 
         VALUES 
         (1, 'Faculty of Engineering', 'Leading engineering faculty with state-of-the-art facilities', 'Dr. John Smith', 'engineering@unitech.edu', '+1-555-0124', 1985),
         (1, 'Faculty of Computer Science', 'Innovative computer science programs and research', 'Dr. Sarah Johnson', 'cs@unitech.edu', '+1-555-0125', 1995),
         (1, 'Faculty of Business Administration', 'Business and management education excellence', 'Dr. Michael Brown', 'business@unitech.edu', '+1-555-0126', 1990)`,
        (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Sample faculties created');
            resolve();
          }
        }
      );
    });

    // Sample courses
    await new Promise((resolve, reject) => {
      connection.query(
        `INSERT IGNORE INTO courses 
         (faculty_id, name, code, description, duration, duration_unit, requirements, fees, intake_capacity, application_deadline) 
         VALUES 
         (1, 'Computer Science Bachelor', 'CS101', 'Comprehensive computer science program covering programming, algorithms, and software engineering', 4, 'years', '{"minGrade": "B", "requiredSubjects": ["Mathematics", "Physics"], "minGPA": 3.0, "entranceExam": true}', '{"domestic": 5000, "international": 15000}', 100, '2024-08-31'),
         (1, 'Electrical Engineering', 'EE201', 'Electrical engineering program with focus on power systems and electronics', 4, 'years', '{"minGrade": "B-", "requiredSubjects": ["Mathematics", "Physics", "Chemistry"], "minGPA": 2.8, "entranceExam": true}', '{"domestic": 5500, "international": 16000}', 80, '2024-08-31'),
         (2, 'Business Administration', 'BA301', 'Business management and administration program', 3, 'years', '{"minGrade": "C+", "requiredSubjects": ["Mathematics", "English"], "minGPA": 2.5, "entranceExam": false}', '{"domestic": 4500, "international": 12000}', 120, '2024-07-31'),
         (3, 'Mechanical Engineering', 'ME401', 'Mechanical engineering with focus on design and manufacturing', 4, 'years', '{"minGrade": "B-", "requiredSubjects": ["Mathematics", "Physics"], "minGPA": 2.8, "entranceExam": true}', '{"domestic": 5200, "international": 15500}', 60, '2024-08-31')`,
        (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Sample courses created');
            resolve();
          }
        }
      );
    });

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Sample Data Created:');
    console.log('   👤 Admin User: admin@careerguide.com / admin123');
    console.log('   🏛️  Institute User: university@edu.com / institute123');
    console.log('   🎓 3 Faculties with 4 Courses');
    
  } catch (error) {
    console.error(' Database setup failed:', error);
  } finally {
    connection.end();
    console.log('🔌 Database connection closed');
  }
};

setupDatabase();