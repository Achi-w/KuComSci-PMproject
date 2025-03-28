const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = 3000;

// -------------------------
// Middleware
// -------------------------
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Prevent caching of protected pages
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------------
// Session Setup
// -------------------------
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// -------------------------
// MySQL Database Connection (using pmdatabase4)
// -------------------------
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "pmdatabase4",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: " + err.message);
  } else {
    console.log("Connected to MySQL database.");
  }
});

// -------------------------
// Login / Dashboard / Logout Routes
// -------------------------
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  // Include USER_Image field in the query.
  const query =
    "SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Password, USER_Image FROM USER WHERE USER_ID = ?";
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error("Database query error: " + err.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    if (results.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
    const user = results[0];
    if (password === user.USER_Password) {
      req.session.user = user;
      return res.json({ success: true });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  });
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized" });
  }
  // The session user now includes USER_Image.
  res.json({ success: true, user: req.session.user });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// -------------------------
// New Endpoint: Get Updated User Data
// -------------------------
app.get("/user/:id", (req, res) => {
  const userId = req.params.id;
  const sql = "SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Image FROM user WHERE USER_ID = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(results[0]);
  });
});

// -------------------------
// Announcement Endpoints
// -------------------------

// Configure Multer to use memory storage (for image Buffer)
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ storage: memoryStorage });

// GET /announcements – return all announcements sorted by date DESC
app.get("/announcements", (req, res) => {
  const sql = `
    SELECT 
      a.Announcement_ID as id,
      a.USER_ID as user_id,
      a.Announcement_Detail as detail,
      DATE_FORMAT(a.Announcement_Start_Date, '%Y-%m-%d') as date,
      a.Announcement_Headline as headline,
      u.USER_Name as first_name,
      u.USER_Surname as last_name,
      u.USER_Role as role,
      u.USER_Image as user_image
    FROM announcement a
    JOIN user u ON a.USER_ID = u.USER_ID
    ORDER BY a.Announcement_Start_Date DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST /announcements – create a new announcement
app.post("/announcements", (req, res) => {
  const { author, date, headline, detail, user_role } = req.body;
  if (user_role.toLowerCase() === "student") {
    return res.status(403).json({ error: "Students are not allowed to create announcements." });
  }
  const announcementId = uuidv4().replace(/-/g, "").substring(0, 20);
  const sqlInsert = `
    INSERT INTO announcement 
      (Announcement_ID, USER_ID, Announcement_Detail, Announcement_Start_Date, Announcement_Headline)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(sqlInsert, [announcementId, author, detail, date, headline], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const sqlSelect = `
      SELECT 
        a.Announcement_ID as id,
        a.USER_ID as user_id,
        a.Announcement_Detail as detail,
        DATE_FORMAT(a.Announcement_Start_Date, '%Y-%m-%d') as date,
        a.Announcement_Headline as headline,
        u.USER_Name as first_name,
        u.USER_Surname as last_name,
        u.USER_Role as role
      FROM announcement a
      JOIN user u ON a.USER_ID = u.USER_ID
      WHERE a.Announcement_ID = ?
    `;
    db.query(sqlSelect, [announcementId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0)
        return res.status(404).json({ error: "Announcement not found" });
      res.status(201).json(rows[0]);
    });
  });
});

// PUT /announcements/:id – update an announcement
app.put("/announcements/:id", (req, res) => {
  const id = req.params.id;
  const { headline, detail, currentUserId, currentUserRole } = req.body;
  if (currentUserRole.toLowerCase() === "student") {
    return res.status(403).json({ error: "Students are not allowed to update announcements." });
  }
  db.query("SELECT USER_ID FROM announcement WHERE Announcement_ID = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
    const announcementUserId = rows[0].USER_ID;
    if (currentUserId !== announcementUserId) {
      return res.status(403).json({ error: "Not authorized to update this announcement" });
    }
    const sqlUpdate = `
      UPDATE announcement
      SET Announcement_Headline = ?, Announcement_Detail = ?
      WHERE Announcement_ID = ?`;
    db.query(sqlUpdate, [headline, detail, id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const sqlSelect = `
        SELECT 
          a.Announcement_ID as id,
          a.USER_ID as user_id,
          a.Announcement_Detail as detail,
          DATE_FORMAT(a.Announcement_Start_Date, '%Y-%m-%d') as date,
          a.Announcement_Headline as headline,
          u.USER_Name as first_name,
          u.USER_Surname as last_name,
          u.USER_Role as role
        FROM announcement a
        JOIN user u ON a.USER_ID = u.USER_ID
        WHERE a.Announcement_ID = ?
      `;
      db.query(sqlSelect, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
        res.json(rows[0]);
      });
    });
  });
});

// POST /announcements/:id/uploadImage – upload an image for a given announcement
app.post('/announcements/:id/uploadImage', uploadMemory.single('image'), (req, res) => {
  const announcementId = req.params.id;
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const imageBuffer = req.file.buffer;
  const announcementImageId = uuidv4().replace(/-/g, "").substring(0, 20);
  
  const sqlInsert = `
    INSERT INTO announcement_image (Announcement_IMAGE_ID, Announcement_ID, A_IMAGE)
    VALUES (?, ?, ?)
  `;
  db.query(sqlInsert, [announcementImageId, announcementId, imageBuffer], (err, result) => {
    if (err) {
      console.error("Error inserting image into DB:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Image uploaded successfully", announcementImageId });
  });
});

// GET /announcements/:announcementId/image/:imageId – serve an image from the DB
app.get('/announcements/:announcementId/image/:imageId', (req, res) => {
  const { announcementId, imageId } = req.params;
  const sql = 'SELECT A_IMAGE FROM announcement_image WHERE Announcement_IMAGE_ID = ? AND Announcement_ID = ?';
  db.query(sql, [imageId, announcementId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Image not found" });
    const imageBuffer = results[0].A_IMAGE;
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': imageBuffer.length
    });
    res.end(imageBuffer);
  });
});

// DELETE /announcements/:id – delete announcement and associated images
app.delete("/announcements/:id", (req, res) => {
  const id = req.params.id;
  const { currentUserId, currentUserRole } = req.body;
  
  if (currentUserRole.toLowerCase() === "student") {
    return res.status(403).json({ error: "Students are not allowed to delete announcements." });
  }
  
  const sqlSelect = `
    SELECT USER_ID 
    FROM announcement 
    WHERE Announcement_ID = ?`;
  db.query(sqlSelect, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
    const announcementUserId = rows[0].USER_ID;
    if (currentUserId !== announcementUserId) {
      return res.status(403).json({ error: "Not authorized to delete this announcement" });
    }
    
    const sqlDeleteImages = `DELETE FROM announcement_image WHERE Announcement_ID = ?`;
    db.query(sqlDeleteImages, [id], (err) => {
      if (err) {
        console.error("Error deleting announcement images:", err);
        return res.status(500).json({ error: err.message });
      }
      const sqlDelete = `DELETE FROM announcement WHERE Announcement_ID = ?`;
      db.query(sqlDelete, [id], (err, result) => {
        if (err) {
          console.error("Error deleting announcement:", err);
          return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) return res.status(404).json({ error: "Announcement not found" });
        res.json({ message: "Announcement deleted successfully" });
      });
    });
  });
});


//-------------------------------ming------------------------------
app.get('/api/user/:USER_ID', (req, res) => {
  const userId = req.params.USER_ID;
  const query = `SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Year, USER_Contact_DETAIL  FROM user WHERE USER_ID = ?`;

  db.query(query, [userId], (err, results) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database query failed' });
      }
      if (results.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }
      res.json(results[0]); // Return user data
  });
});


app.get('/api/course_review', async (req, res) => {
  try {
      const { Course_ID, USER_ID } = req.query;
      const sql = `SELECT Review_Course_ID, USER_ID, Course_ID, Review_Course_Details, Review_Course_Rate, Review_Course_Date, Review_Course_Time FROM course_review WHERE Course_ID = ? AND USER_ID = ?`;

      db.query(sql, [Course_ID, USER_ID], (err, results) => {
          if (err) {
              console.error("Database error:", err);
              return res.status(500).json({ message: "Internal Server Error" });
          }

          // ✅ Always return an array
          res.json(results.length ? results : []);
      });
  } catch (error) {
      console.error("Error fetching course reviews:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
});




// ดึงข้อมูลคอร์สจาก Course_ID
app.get('/api/course/:Course_ID', (req, res) => {
  const CId = req.params.Course_ID;
  db.query('SELECT Course_ID,Course_Name,Course_Detail FROM course WHERE Course_ID = ?', [CId], (err, results) => {
      if (err) {
          console.error(err);
          res.status(500).json({ error: 'Database query failed' });
      } else if (results.length === 0) {
          res.status(404).json({ error: 'Course not found' });
      } else {
          res.json(results[0]);
      }
  });
});
app.get('/api/course_review', (req, res) => {
  const { Course_ID, USER_ID } = req.query;


  if (!Course_ID || !USER_ID) {
      return res.status(400).json({ error: "Course_ID and USER_ID are required" });
  }

  const query = `
      SELECT Review_Course_ID FROM course_review
      WHERE Course_ID = ? AND USER_ID = ?
  `;

  db.query(query, [Course_ID, USER_ID], (err, results) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database query failed' });
      }
      if (results.length > 0) {
          return res.json({ hasReviewed: true, review: results });
      } else {
          return res.json({ hasReviewed: false });
      }
  });
});


// ดึงรีวิวของคอร์ส พร้อมคำนวณค่าเฉลี่ย Review_Course_Rate
app.get('/api/course_review/:Course_ID', (req, res) => {
  const CId = req.params.Course_ID;

  const query = `
      SELECT Review_Course_ID, USER_ID, Course_ID, Review_Course_Details, 
             Review_Course_Rate, Review_Course_Date, Review_Course_Time
      FROM course_review 
      WHERE Course_ID = ?
  `;

  db.query(query, [CId], (err, results) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database query failed' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'No course_review data found' });
      }

      // Calculate average rating
      const totalScore = results.reduce((sum, row) => sum + (row.Review_Course_Rate || 0), 0);
      const avgScore = results.length > 0 ? totalScore / results.length : 0;

      res.json({ reviews: results, avgScore });
  });
});


// ดึงข้อมูลคอร์สทั้งหมดพร้อมกับค่าเฉลี่ยของ Review_Course_Rate
app.get('/api/course', (req, res) => {
  const query = `
      SELECT c.Course_ID, c.Course_Name, c.Course_Detail,
          IFNULL(AVG(cr.Review_Course_Rate), 0) AS avg_rating
      FROM course c
      LEFT JOIN course_review cr ON c.Course_ID = cr.Course_ID
      GROUP BY c.Course_ID
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching courses:', err);
          res.status(500).json({ error: 'Database query failed' });
      } else if (results.length === 0) {
          res.status(404).json({ error: 'Course not found' });
      } else {
          res.json(results); // ส่งข้อมูลที่มีการคำนวณค่าเฉลี่ย
      }
  });
});
app.post('/api/course_review', async (req, res) => {
  try {
      const { Review_Course_ID, USER_ID, Course_ID, Review_Course_Details, Review_Course_Rate, Review_Course_Date, Review_Course_Time} = req.body;

      if (!USER_ID || !Course_ID) {
          return res.status(400).json({ message: 'Missing required fields' });
      }

      const sql = `INSERT INTO course_review (Review_Course_ID, USER_ID, Course_ID, Review_Course_Details, Review_Course_Rate, Review_Course_Date, Review_Course_Time) VALUES (?, ?, ?, ?, ?, ?, ?)`;

      db.query(sql, [Review_Course_ID, USER_ID, Course_ID, Review_Course_Details, Review_Course_Rate, Review_Course_Date, Review_Course_Time]);

      res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.delete('/api/course_review/:Review_Course_ID', (req, res) => {
  const reviewID = req.params.Review_Course_ID;
  db.query('DELETE FROM course_review WHERE Review_Course_ID = ?', [reviewID], (err, results) => {
      if (err) {
          res.status(500).json({ error: 'Delete failed' });
      } else {
          res.json({ message: 'Review deleted successfully' });
      }
  });
});




//-------------------------------ming------------------------------


//-------------------------------harry------------------------------
//show sec uc8
//ok front end implemented
app.get('/api/sectionform',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  console.log('request sectionform');
  
  db.query('SELECT `Section_Form_ID`, `Course_ID`, `USER_ID`, `SEC`, `Current_Nisit_Number`, `Section_Form_start_time`, `Section_Form_Maximum_Nisit`, `Section_Form_Minimum_Nisit`,`Section_Form_STATUS` FROM `section_form`',(err,result,fields)=>{
      if(err){
          console.error(err);
          return res.status(201).send(
              {
                  status:0,
                  info:'error'
              }
          )
      }

      console.log(result);
      
      return res.status(200).send(
          {
              status:1,
              info: result
          }
      )
      
  })
})

//ok front end implemented
app.post('/api/sectionform',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');
    
    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  const data = req.body;
  let userCurr;
  console.log('---------------------user add section-------------------------');
  
  const idToinsertSec = crypto.randomUUID();
  console.log(idToinsertSec);
  console.log('---------------------------------------------------');
  
  if(data.who){
      userCurr = 0;
  }else{
      userCurr = 1;
  }
  
  db.query(`SELECT Section_Form_ID FROM section_form WHERE Course_ID = ? AND SEC = ? AND (Section_Form_STATUS = '0' OR Section_Form_STATUS = '1')`,[data.courseId,data.sec],(err,resultSec,fields)=>{
      console.log('-------------------log now find if same sec--------------');
      console.log('eeeeeeeeeeeeeeeeeeeeee');
    
      
      console.log();
      
      if(err){
          console.error(err);
          return res.status(201).send(
              {
                  status:0,
                  errorId : 0,
                  info:'error'
              }
          )
      }

      if(resultSec.length>0){
          console.log('-------------------------------------smae sec--------------------------');
          
          return res.status(200).send(
              {
                  status:0,
                  errorId : 1,
                  info:'name already taken'
              }
          )
      }else{
          console.log('-------------------------------------------------------------------');
          console.log(data.who);
          
          
          if(data.who){
            db.query('INSERT INTO `section_form`(`Section_Form_ID`,`Course_ID`,`SEC`, `Current_Nisit_Number`, `Section_Form_start_time`,`Section_Form_Maximum_Nisit`, `Section_Form_STATUS`,`Section_Form_Minimum_Nisit`) VALUES (?,?,?,?,?,?,?,?)',
          [idToinsertSec,data.courseId, data.sec, userCurr,data.sectionFormStartTime, data.sectionFormMaximumNisit,0,data.sectionFormMinimumNisit],
          (err,resutl,fields)=>{
              if(err){
                  console.error(err);
                  return res.status(201).send(
                      {
                          status:0,
                          errorId : 0,
                          info:'error'
                      }
                  )
              }
              return res.status(201).send(
                  {
                      status:1,
                      info: 'ok'
                  }
              )
              
          }
      )
          }else{
            console.log('---------------------------------------------------nisit goes here');
            
            db.query('INSERT INTO `section_form`(`Section_Form_ID`,`Course_ID`,`SEC`, `Current_Nisit_Number`, `Section_Form_start_time`,`Section_Form_Maximum_Nisit`, `Section_Form_STATUS`,`Section_Form_Minimum_Nisit`) VALUES (?,?,?,?,?,?,?,?)',
          [idToinsertSec,data.courseId, data.sec, 1,data.sectionFormStartTime, data.sectionFormMaximumNisit,0,data.sectionFormMinimumNisit],
          (err,resutl,fields)=>{
              if(err){
                  console.error(err);
                  return res.status(201).send(
                      {
                          status:0,
                          errorId : 0,
                          info:'error'
                      }
                  )
              }

              const idToinsertSecList = crypto.randomUUID();

                      
              db.query(' INSERT INTO Section_Form_Nisit_List(Section_Form_Nisit_List_ID, Section_Form_ID,USER_ID) VALUES (?,?,?)',
                  [idToinsertSecList,idToinsertSec, data.sectionFormNisitListName],
                  (err,result,fields)=>{
                      if(err){
                          console.error(err);
                          return res.status(201).send(
                              {
                                  status:0,
                                  errorId : 0,
                                  info:'error'
                              }
                          )
                      }
                      console.log('complete');
  
                      return res.status(200).send(
                          {
                              status:1,
                              info:'ok'
                          }
                      )
                  }
              )
  
          }
          )

          }
          
      }
  })
      
})

//ok implemted front end
app.put('/api/sectionform/add',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  console.log('user want to add nisit');
  
  const data = req.body;
  console.log('------------------------------------------------------------------------');
  
  console.log(data);
  console.log('------------------------------------------------------------------------');
  db.query('SELECT USER_ID From Section_Form_Nisit_List Where USER_ID = ? AND Section_Form_ID = ?', [data.sectionFormNisitId,data.sectionFormId],(err,resultNisit,fields)=>{
      if(err){
          console.log(err);
          return res.status(201).send(
              {
                  status:0,
                  info:'error'
              }
          )
      }
      if(resultNisit.length >0){
          console.log('this user had registered');
          return res.status(201).send(
              {
                  status:0,
                  errorCode:1,
                  info:'error'
              }
          )
      }else{
          db.query('UPDATE section_form SET Current_Nisit_Number = ? WHERE Section_Form_ID = ?',
              [data.currentNisitNumber, data.sectionFormId],
              (err,result,fields)=>{
                  if(err){
                      console.error(err);
                      return res.status(201).send(
                          {
                              status:0,
                              info:'error'
                          }
                      )
                  }
                  
                  const idToinsertSecList = crypto.randomUUID();
                  
                  db.query('INSERT INTO Section_Form_Nisit_List(Section_Form_Nisit_List_ID, Section_Form_ID, USER_ID) VALUES (?,?,?)',
                          [idToinsertSecList,data.sectionFormId, data.sectionFormNisitId],
                          (err,result,fields)=>{
                              if(err){
                                  console.error(err);
                                  return res.status(201).send(
                                      {
                                          status:0,
                                          info:'error'
                                      }
                                  )
                              }
                              console.log('complete');
                              return res.status(200).send(
                                  {
                                      status:1,
                                      info:'complete'
                                  }
                              )
                      })
              })        
      }
  })
  
})

//ok front end implemented
app.get('/api/sectionform/teacher/:teacherId',(req,res)=>{
  console.log('user teacher call section');
  
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  
  
  const teacherId = req.params.teacherId;

  console.log(teacherId);
  console.log('now go to where admin or teacher');
  
  
  if(teacherId == 'admin'){
    console.log('go to admin');
    
    db.query(`SELECT Section_Form_ID,Course_ID,SEC,Current_Nisit_Number,Section_Form_start_time,Section_Form_STATUS, Section_Form_Minimum_Nisit, Section_Form_Maximum_Nisit FROM Section_Form WHERE Section_Form_STATUS = 0`,
    teacherId,(err,result,fields)=>{
        if(err){
            console.error(err);
            return res.status(201).send(
                {
                    status:0,
                    info:'error'
                }
            )
        }else{
          console.log('complete');
          console.log(result);
          
          return res.status(200).send(
              {
                  status:1,
                  info:result
              }
          )  
        }
    }
    )
  }else{
    db.query(`SELECT sf.*
      FROM section_form sf
      JOIN course c ON sf.Course_ID = c.Course_ID
      JOIN user_s_course usc ON c.Course_ID = usc.Course_ID
      WHERE usc.USER_ID = ? AND sf.Section_Form_STATUS = '0'`,
    teacherId,(err,result,fields)=>{
        if(err){
            console.error(err);
            return res.status(201).send(
                {
                    status:0,
                    info:'error'
                }
            )
        }

        console.log('complete');
        return res.status(200).send(
            {
                status:1,
                info:result
            }
        )

    }
)

  }

})


//ok impletmented
app.put('/api/sectionform/status/:formId',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  const data = req.body;
  const formId = req.params.formId;
  console.log(data, formId);
  
    db.query('UPDATE section_form SET Section_Form_STATUS = ? , USER_ID = ? WHERE Section_Form_ID = ?',
      [data.sectionFormStatus,data.sectionFormPermission, formId],
      (err,result,fields)=>{

          if(err){
              console.error(err);
              return res.status(201).send(
                  {
                      status:0,
                      info:'error'
                  }
              )
          }
          if(data.sectionFormStatus === 1){
            db.query('UPDATE section_from')
          }else{
            console.log('complete');
            res.status(200).send(
                {
                    status:1,
                    info:"complete"
                }
            )
  
          }

      }
  )
})

app.get('/api/courseSecTeacher/:id',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }

  const id = req.params.id;
  

  db.query('SELECT u.USER_ID, u.USER_Name, u.USER_Surname, c.Course_ID, c.Course_Name, c.Course_Detail FROM user_s_course uc JOIN user u ON uc.USER_ID = u.USER_ID JOIN course c ON uc.Course_ID = c.Course_ID WHERE u.USER_ID = ?', [id],(err,result,fields)=>{
    if(err){
      console.error(err);
      return res.status(201).send(
          {
              status:0,
              info:'error'
          }
      )
    }else{
      console.log('------------------');
      console.log(result);
      
      
      return res.status(200).send(
        {
            status:1,
            info:result
        }
    )
    }
  })
})

//ok implemented front end
app.get('/api/sectionform/id/:id',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  const id = req.params.id; 
  console.log(id);
  
  db.query('SELECT `Section_Form_ID`, `Course_ID`, `USER_ID`, `SEC`, `Current_Nisit_Number`, `Section_Form_start_time`, `Section_Form_Maximum_Nisit`, `Section_Form_Minimum_Nisit`,`Section_Form_STATUS` FROM `section_form` WHERE `Section_Form_ID` = ?',
      [id], (err,result,fields)=>{
          if(err){
              console.error(err);
              return res.status(201).send(
                  {
                      status:0,
                      info:'error'
                  }
              )
          }
          console.log(result);
          console.log();
          
          db.query('SELECT `Section_Form_Nisit_List_ID`, `Section_Form_ID`, `USER_ID` FROM `section_form_nisit_list` WHERE `Section_Form_ID` = ?',
              [result[0].Section_Form_ID], async(err,resultNisit,field)=>{
                  if(err){
                      console.error(err);
                      return res.status(201).send(
                          {
                              status:0,
                              info:'error'
                          }
                      )
                  }

                  const nisitDetail = resultNisit.map(async (nisit)=>{
                      const [resultEachNisit] = await db.promise().query(
                          'SELECT `USER_ID`, `USER_Name`, `USER_Surname` FROM `user` WHERE USER_ID = ?',nisit.USER_ID
                      )

                      nisit.Section_Form_Nisit_List_Name = resultEachNisit[0].USER_Name + ' ' + resultEachNisit[0].USER_Surname + ' ' + resultEachNisit[0].USER_ID;
                  })

                  await Promise.all(nisitDetail);

                  res.status(200).send(
                      {
                          status:1,
                          info:{...result[0],
                              nisitList : resultNisit
                          }
                      }
                  )    
              }
          )
      }
  )
})

app.get('/api/courseSec/:id',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  console.log('user  get course');
  
  const id = req.params.id;
  console.log(id);

  db.query('SELECT Course_ID,Course_Name,Course_Detail FROM Course WHERE Course_id = ?',[id],(err,result,fields)=>{
      if(err){
          console.error(err);
          return res.status(201).send(
              {
                  status:0,
                  info:'error'
              }
          )
      }
      console.log(result);
      
      db.query('SELECT `USER_ID` FROM `user_s_course` WHERE `Course_ID` = ?',result[0].Course_ID,(err,resultCourseS,fields)=>{
              if(err){
                  console.log(err);
                  
                  return res.status(201).send({
                      status:0,
                      info:"error"
                  })
              }
              
              db.query('SELECT `USER_Name`, `USER_Surname` FROM `user` WHERE USER_ID = ?',resultCourseS[0].USER_ID,(err,resultUser,fields)=>{
                  if(err){
                      console.log(err);
                      
                      return res.status(201).send({
                          status:0,
                          info:"error"
                      })
                  }

                  result[0].Course_Owner_Name = resultUser[0].USER_Name + ' ' +  resultUser[0].USER_Surname;
                  console.log(result);
                  
                  return res.status(200).send(
                      {
                          status:1,
                          info: result[0]
                      }
                  )
              })
          })

      
      
      
  })
})

app.get('/api/allcourse',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  db.query('SELECT Course_ID,Course_Name,Course_Detail FROM Course',(err,result,fields)=>{
      if(err){
          console.error(err);
          return res.status(201).send(
              {
                  status:0,
                  info:'error'
              }
          )
      }
      return res.status(200).send(
          {
              status:1,
              info: result
          }
      )
      
  })
})

app.delete('/api/sectionform/delete/:id',(req,res)=>{
  if (!req.session.user){
    console.log('user have no right');

    return res.status(201).send({
      status:0,
      info:'you have no access'
    })
  }
  const id = req.params.id;
  console.log(`user want to delete sectionform : ${id}` );

  db.query('DELETE FROM `section_form` WHERE `Section_Form_ID` = ?',[id],(err,result,fields)=>{
      if(err){
          console.error(err);
          return res.status(201).send(
              {
                  status:0,
                  info:'error'
              }
          )
      }
      console.log(`delete section form : ${id}`);
      
      return res.status(200).send(
          {
              status:1,
              info: 'success'
          }
      )      
  })
  
  
})

app.get('/api/reauth',(req,res)=>{
  console.log(req.session);
  
  if(req.session.user){
    console.log('have user');

    res.status(200).send({
      status:1,
      info: req.session.user
    })
    
  }else{
    console.log(' no user');
    
    res.status(201).send({
      status:0,
      info: 'unauthorize access'
    })
  }
})
//-------------------------------harry------------------------------

// -------------------------
// Booking Layout Setup
// -------------------------
const expressLayouts = require('express-ejs-layouts');
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');
app.use(expressLayouts);

const roomBookingRouter = require('./routers/RoomBookingRouter.js');
const { connect } = require("http2");
app.use('/roomBooking', roomBookingRouter);
//-------------------------------Frame------------------------------
//--- WiN
const professorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // เก็บไฟล์ในโฟลเดอร์ 'uploads'
  },
  filename: (req, file, cb) => {
    cb(null, `professor_${Date.now()}_${file.originalname}`); // ตั้งชื่อไฟล์เป็น timestamp + ชื่อไฟล์เดิม
  }
});

// กำหนดขีดจำกัดขนาดไฟล์ (10MB)
const professorUpload = multer({ storage: professorStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ใช้ CORS สำหรับการร้องขอจากเครื่องลูก
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/addProf', professorUpload.single('USER_Image'), (req, res) => {
  const { USER_ID, USER_Name, USER_Surname, USER_Password, USER_Contact_DETAIL, USER_Room, USER_Role, USER_Year } = req.body;
  const USER_Image = req.file ? req.file.filename : null; // รับชื่อไฟล์จาก multer

  const sql = `INSERT INTO user (USER_ID, USER_Name, USER_Surname, USER_Role, USER_Password, USER_Year, USER_Contact_DETAIL, USER_Room, USER_Image) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [USER_ID, USER_Name, USER_Surname, USER_Role, USER_Password, USER_Year || 0, USER_Contact_DETAIL, USER_Room, USER_Image], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to add professor' });
      }
      res.status(201).json({ message: 'Professor added successfully', userId: result.insertId });
  });
});

// PUT: อัปเดตข้อมูลอาจารย์
app.put('/updateProf', professorUpload.single('USER_Image'), (req, res) => {
  const { USER_ID, USER_Name, USER_Surname, USER_Contact_DETAIL, USER_Room, USER_Year } = req.body;
  const USER_Image = req.file ? req.file.filename : null; // รับชื่อไฟล์ใหม่ (ถ้ามี)

  // ตรวจสอบว่ามีการอัปโหลดรูปภาพหรือไม่
  let sql;
  let params;

  if (USER_Image) {
      // ถ้ามีการอัปโหลดรูปภาพใหม่ ให้รวม USER_Image ในการอัปเดต
      sql = `UPDATE user 
             SET USER_Name = ?, USER_Surname = ?, USER_Contact_DETAIL = ?, USER_Room = ?, USER_Year = ?, USER_Image = ? 
             WHERE USER_ID = ?`;
      params = [USER_Name, USER_Surname, USER_Contact_DETAIL, USER_Room, USER_Year, USER_Image, USER_ID];
  } else {
      // ถ้าไม่มีการอัปโหลดรูปภาพใหม่ ไม่ต้องอัปเดต USER_Image
      sql = `UPDATE user 
             SET USER_Name = ?, USER_Surname = ?, USER_Contact_DETAIL = ?, USER_Room = ?, USER_Year = ? 
             WHERE USER_ID = ?`;
      params = [USER_Name, USER_Surname, USER_Contact_DETAIL, USER_Room, USER_Year, USER_ID];
  }

  db.query(sql, params, (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to update professor' });
      }
      res.status(200).json({ message: 'Professor updated successfully' });
  });
});

// GET: ดึงข้อมูลอาจารย์ทั้งหมด (พร้อมภาพ)
app.get('/getProfessors', (req, res) => {
  const sql = "SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Contact_DETAIL, USER_Room, USER_Image FROM user WHERE USER_Role = 'Teacher'";

  db.query(sql, (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to fetch professors' });
      }

      const professors = results.map(prof => ({
          ...prof,
          USER_Image: prof.USER_Image ? `http://localhost:${PORT}/uploads/${prof.USER_Image}` : null
      }));

      res.json(professors);
  });
});
app.get('/getProfessor/:id', (req, res) => {
  const sql = "SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Contact_DETAIL, USER_Room, USER_Image FROM user WHERE USER_Role = 'Teacher' AND USER_ID = ?";
  
  db.query(sql, [req.params.id], (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to fetch professors' });
      }
      
      if (results.length > 0) {
          const professor = results[0];
          professor.USER_Image = professor.USER_Image ? `http://localhost:${PORT}/uploads/${professor.USER_Image}` : null;
          res.json(professor); // ส่ง object เดียว ไม่ใช่ array
      } else {
          res.status(404).json({ error: 'Professor not found' });
      }
  });
});
// DELETE: ลบอาจารย์
app.delete('/deleteProf/:USER_ID', (req, res) => {
  const { USER_ID } = req.params;

  const sql = `DELETE FROM user WHERE USER_ID = ?`;

  db.query(sql, [USER_ID], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to delete professor' });
      }
      res.status(200).json({ message: 'Professor deleted successfully' });
  });
});

// GET: ดึงข้อมูลอาจารย์โดยใช้ USER_ID
app.get('/user/:USER_ID', (req, res) => {
  const { USER_ID } = req.params;
  const sql = `SELECT USER_ID, USER_Name, USER_Surname, USER_Contact_DETAIL, USER_Room, USER_Year 
               FROM user WHERE USER_ID = ? AND USER_Role = 'Teacher'`;

  db.query(sql, [USER_ID], (err, results) => {
      if (err) {
          res.status(500).json({ error: err.message });
          return;
      }
      if (results.length > 0) {
          res.json(results[0]);
      } else {
          res.status(404).json({ error: 'Professor not found' });
      }
  });
});

// เสิร์ฟไฟล์ภาพจากโฟลเดอร์ uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//--- WiN


// -------------------------
// Start the Server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
