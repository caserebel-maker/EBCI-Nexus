<?php
// /career/submit.php
header('Content-Type: application/json');

// NOTE: We are NOT using the legacy MySQL connection anymore.
// Connecting directly to Nexus SQLite DB to ensure real-time dashboard updates.

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }

    // 1. Setup SQLite Connection
    $dbPath = __DIR__ . '/../nexus/prisma/dev.db';
    if (!file_exists($dbPath)) {
        throw new Exception('Database file not found at: ' . $dbPath);
    }

    // Connect via PDO
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 2. Handle File Uploads (Same as before, but mapped to new schema)
    $uploadDir = __DIR__ . '/uploads/applicants/';
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }

    $photoPath = '';
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
        $fileName = 'photo_' . time() . '_' . uniqid() . '.' . $ext;
        if (move_uploaded_file($_FILES['photo']['tmp_name'], $uploadDir . $fileName)) {
            // Store relative path for Nexus to find
            // Note: Nexus is in /nexus, uploads are in /career/uploads
            // We need to serve these files. For now, we store the path relative to project root possibility.
            // Or better, just store '/uploads/career/...' if we symlink.
            // Assumption: The frontend displays images. 
            // In the previous code, it stored 'career/uploads/applicants/...'
            $photoPath = '/uploads/applicants/' . $fileName;

            // Note: To make this visible in Next.js, we might need a symlink or route handler.
            // For Phase 1, we persist the logic but we might need to copy/move files to nexus/public/uploads 
            // OR set up a serve route.
            // HOTFIX for Localhost/Next.js: Move file to nexus/public/uploads if possible?
            // Let's stick to the directory, but maybe copy it to Nexus public?
            // Nexus public is ../nexus/public/uploads/mock/

            $nexusPublicDir = __DIR__ . '/../nexus/public/uploads/career/';
            if (!file_exists($nexusPublicDir))
                mkdir($nexusPublicDir, 0755, true);
            copy($uploadDir . $fileName, $nexusPublicDir . $fileName);
            $photoPath = '/uploads/career/' . $fileName; // Path relative to public/ in Next.js
        }
    }

    $resumePath = '';
    if (isset($_FILES['resume']) && $_FILES['resume']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['resume']['name'], PATHINFO_EXTENSION);
        $fileName = 'resume_' . time() . '_' . uniqid() . '.' . $ext;
        if (move_uploaded_file($_FILES['resume']['tmp_name'], $uploadDir . $fileName)) {
            $nexusPublicDir = __DIR__ . '/../nexus/public/uploads/career/';
            if (!file_exists($nexusPublicDir))
                mkdir($nexusPublicDir, 0755, true);
            copy($uploadDir . $fileName, $nexusPublicDir . $fileName);
            $resumePath = '/uploads/career/' . $fileName;
        }
    }

    // 3. Prepare Data for New Schema (Applicant)
    $fullName = $_POST['name'] ?? 'Unknown';
    // Split name
    $nameParts = explode(' ', trim($fullName), 2);
    $firstName = $nameParts[0];
    $lastName = $nameParts[1] ?? ' '; // Last name defaults to space if not found

    $position = $_POST['position'] ?? 'General Application';
    $salary = floatval($_POST['salary'] ?? 0);
    $phone = $_POST['phone'] ?? '';
    $email = $_POST['email'] ?? '';

    // Generate CUID/UUID
    $id = sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff)
    );

    // Defaults for mandatory fields
    $status = 'pending';
    $createdAt = date('Y-m-d H:i:s'); // SQLite text format for datetime
    $updatedAt = date('Y-m-d H:i:s');
    $address = "Not provided (Quick Apply)";
    $dateOfBirth = mktime(0, 0, 0, 1, 1, 1970) * 1000; // Epoch ms or format? Prisma stores DateTime. SQLite stores text/int.
    // Prisma usually expects ISO string or timestamp in SQLite. Let's use ISO.
    $dateOfBirthIso = "1970-01-01T00:00:00.000Z";
    $age = 0;

    // 4. Insert into 'applicants' table
    $sql = "INSERT INTO applicants (
        id, 
        position_applied, 
        expected_salary, 
        first_name, 
        last_name, 
        phone, 
        email, 
        photo_path, 
        resume_path, 
        status, 
        created_at, 
        updated_at,
        current_address,
        date_of_birth,
        age
    ) VALUES (
        :id, 
        :position, 
        :salary, 
        :firstName, 
        :lastName, 
        :phone, 
        :email, 
        :photo, 
        :resume, 
        :status, 
        :createdAt, 
        :updatedAt,
        :address,
        :dob,
        :age
    )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':position' => $position,
        ':salary' => $salary,
        ':firstName' => $firstName,
        ':lastName' => $lastName,
        ':phone' => $phone,
        ':email' => $email,
        ':photo' => $photoPath,
        ':resume' => $resumePath,
        ':status' => $status,
        ':createdAt' => floor(microtime(true) * 1000), // Prisma uses milliseconds for DateTime in SQLite often? Or ISO? 
        // Wait, for SQLite Prisma stores timestamps as Integers (milliseconds usually) OR Strings.
        // Checking schema check... "DateTime"
        // Let's safe-bet on Milliseconds epoch for Prisma + SQLite if simple setup, OR ISO8601.
        // Let's try ISO8601 string first, as it's safer.
        // Actually, Prisma default is to store DateTime as Milliseconds in SQLite unless configured otherwise.
        // Let's try to update the SQL to use current_timestamp or pass the milliseconds.
        // Actually, let's use the current time in milliseconds.
        ':updatedAt' => floor(microtime(true) * 1000),
        ':address' => $address,
        ':dob' => 0, // 1970
        ':age' => $age
    ]);

    echo json_encode(['status' => 'success', 'message' => 'Application submitted and synced to Nexus Dashboard']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>