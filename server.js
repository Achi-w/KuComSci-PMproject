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

// Login Route – fetch full user record including USER_ID
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const query =
    "SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Password FROM USER WHERE USER_Name = ?";
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
      // Store the full user record in session
      req.session.user = user;
      return res.json({ success: true });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  });
});

// Dashboard Route – returns logged‑in user (as "user")
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  res.json({ success: true, user: req.session.user });
});

// Logout Route – destroys the session
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// -------------------------
// Announcement Endpoints
// -------------------------

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure "uploads" folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET /user/:id – used if needed by announcement.js
app.get("/user/:id", (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Year, USER_Contact_DETAIL 
    FROM USER 
    WHERE USER_ID = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(results[0]);
  });
});

// GET /announcements – return all announcements sorted by date DESC
app.get("/announcements", (req, res) => {
  const sql = `
    SELECT 
      Announcement_ID as id,
      USER_ID as user_id,
      USER_Name as first_name,
      USER_Surname as last_name,
      USER_Role as role,
      Announcement_Detail as detail,
      DATE_FORMAT(Announcement_Start_Date, '%Y-%m-%d') as date,
      Announcement_Headline as headline
    FROM announcement
    ORDER BY Announcement_Start_Date DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST /upload – handle image upload
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "No file uploaded" });
  const imageUrl = req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename;
  res.json({ imageUrl });
});

// POST /deleteImage – delete an uploaded image file
app.post("/deleteImage", (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl)
    return res.status(400).json({ error: "No image URL provided" });
  const baseUrl = req.protocol + "://" + req.get("host") + "/";
  const filePath = imageUrl.replace(baseUrl, "");
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res.status(500).json({ error: "Error deleting file" });
    }
    res.json({ message: "File deleted successfully" });
  });
});

// POST /announcements – create a new announcement
app.post("/announcements", (req, res) => {
  const { author, user_name, user_surname, user_role, date, headline, detail } = req.body;
  if (user_role.toLowerCase() === "student") {
    return res.status(403).json({ error: "Students are not allowed to create announcements." });
  }
  const announcementId = uuidv4().replace(/-/g, "").substring(0, 20);
  const sqlInsert = `
    INSERT INTO announcement 
      (Announcement_ID, USER_ID, USER_Name, USER_Surname, USER_Role, Announcement_Detail, Announcement_Start_Date, Announcement_Headline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sqlInsert, [announcementId, author, user_name, user_surname, user_role, detail, date, headline], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const sqlSelect = `
      SELECT 
        Announcement_ID as id,
        USER_ID as user_id,
        USER_Name as first_name,
        USER_Surname as last_name,
        USER_Role as role,
        Announcement_Detail as detail,
        DATE_FORMAT(Announcement_Start_Date, '%Y-%m-%d') as date,
        Announcement_Headline as headline
      FROM announcement
      WHERE Announcement_ID = ?`;
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
          Announcement_ID as id,
          USER_ID as user_id,
          USER_Name as first_name,
          USER_Surname as last_name,
          USER_Role as role,
          Announcement_Detail as detail,
          DATE_FORMAT(Announcement_Start_Date, '%Y-%m-%d') as date,
          Announcement_Headline as headline
        FROM announcement
        WHERE Announcement_ID = ?`;
      db.query(sqlSelect, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
        res.json(rows[0]);
      });
    });
  });
});

// DELETE /announcements/:id – delete an announcement and its referenced images
app.delete("/announcements/:id", (req, res) => {
  const id = req.params.id;
  const { currentUserId, currentUserRole } = req.body;
  if (currentUserRole.toLowerCase() === "student") {
    return res.status(403).json({ error: "Students are not allowed to delete announcements." });
  }
  const sqlSelect = `SELECT USER_ID, Announcement_Detail as detail FROM announcement WHERE Announcement_ID = ?`;
  db.query(sqlSelect, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
    const announcementUserId = rows[0].USER_ID;
    if (currentUserId !== announcementUserId) {
      return res.status(403).json({ error: "Not authorized to delete this announcement" });
    }
    const detail = rows[0].detail;
    const regex = /<img\s+[^>]*src=['"]([^'"]+)['"]/gi;
    let match;
    while ((match = regex.exec(detail)) !== null) {
      const imageUrl = match[1];
      const filePath = imageUrl.replace(req.protocol + "://" + req.get("host") + "/", "");
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    const sqlDelete = `DELETE FROM announcement WHERE Announcement_ID = ?`;
    db.query(sqlDelete, [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Announcement not found" });
      res.json({ message: "Announcement deleted successfully" });
    });
  });
});


//-------------------------------harry------------------------------
//show sec uc8
//ok front end implemented
app.get('/api/sectionform',(req,res)=>{
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
          db.query('INSERT INTO `section_form`(`Section_Form_ID`,`Course_ID`,`USER_ID`,`SEC`, `Current_Nisit_Number`, `Section_Form_start_time`,`Section_Form_Maximum_Nisit`, `Section_Form_STATUS`,`Section_Form_Minimum_Nisit`) VALUES (?,?,?,?,?,?,?,?,?)',
          [idToinsertSec,data.courseId, data.userId,data.sec, userCurr,data.sectionFormStartTime, data.sectionFormMaximumNisit,0,data.sectionFormMinimumNisit],
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

              
              if(data.who){
                  return res.status(201).send(
                      {
                          status:1,
                          info: 'ok'
                      }
                  )
              }
              const idToinsertSecList = crypto.randomUUID();

                      
              db.query(' INSERT INTO Section_Form_Nisit_List(Section_Form_Nisit_List_ID, Section_Form_ID,Section_Form_Nisit_List_Name) VALUES (?,?,?)',
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
  })
      
})

//ok implemted front end
app.put('/api/sectionform/add',(req,res)=>{
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
  const teacherId = req.params.teacherId;

  db.query('SELECT Section_Form_ID,Course_ID,SEC,Current_Nisit_Number,Section_Form_start_time,Section_Form_STATUS, Section_Form_Minimum_Nisit, Section_Form_Maximum_Nisit FROM Section_Form WHERE Section_Form_STATUS = 0',
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
                  info:result
              }
          )

      }
  )

})


//ok impletmented
app.put('/api/sectionform/status/:formId',(req,res)=>{
  const data = req.body;
  const formId = req.params.formId;
  console.log(data, formId);
  
  db.query('UPDATE section_form SET Section_Form_STATUS = ? WHERE Section_Form_ID = ?',
      [data.sectionFormStatus,formId],
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
          res.status(200).send(
              {
                  status:1,
                  info:"complete"
              }
          )

      }
  )
})

//ok implemented front end
app.get('/api/sectionform/id/:id',(req,res)=>{
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

app.get('/api/course/:id',(req,res)=>{
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
//-------------------------------harry------------------------------


// -------------------------
// Start the Server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
