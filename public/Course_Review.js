const courseList = document.getElementById('course-item');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

let allCourses = []; // เก็บข้อมูลคอร์สทั้งหมด
let currentUser = {};
let announcements = [];
// ดึงข้อมูลคอร์สจาก API
const fetchCourses = async () => {
    try {
        const { data } = await axios.get('http://localhost:3000/api/course');
        allCourses = data; // เก็บข้อมูลทั้งหมด
        displayCourses(data); // แสดงผล
    } catch (error) {
        console.error('Error fetching courses:', error);
    }
};

// แสดงคอร์สในรูปแบบที่คุณต้องการ
const displayCourses = (courses) => {
    courseList.innerHTML = '';
    courses.forEach(course => {
        console.log(course); // Debugging
        const courseDiv = document.createElement('div');
        courseDiv.classList.add('course-item');

        courseDiv.innerHTML = `
            <div class="course-header">
                <div class="course-name">${course.Course_ID} - ${course.Course_Name}</div>
                <div class="course-rating">${(Number(course.avg_rating) || 0).toFixed(1)}/10</div>
            </div>
            <div class="course-description">${course.Course_Detail}</div>
        `;

        courseDiv.addEventListener('click', () => goToDetails(course.Course_ID));
        courseList.appendChild(courseDiv);
    });
};

 // Retrieve the logged-in user from the dashboard route
 document.addEventListener("DOMContentLoaded", () => {
  fetch("/dashboard")
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        currentUser = data.user;
        document.getElementById("userName").textContent =
          currentUser.USER_Name + " " + currentUser.USER_Surname;
        if (currentUser.USER_Role.toLowerCase() === "student") {
          document.getElementById("roleTitle").textContent =
            "Nisit Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
        } else if (["teacher", "professor"].includes(currentUser.USER_Role.toLowerCase())) {
          document.getElementById("roleTitle").textContent =
            "Professor Comsci - ภาควิชาวิทยาการคอมพิวเตอร์";
        } else if (currentUser.USER_Role.toLowerCase() === "admin") {
          document.getElementById("roleTitle").textContent =
            "Admin - ภาควิชาวิทยาการคอมพิวเตอร์";
        }
        const postBtn = document.getElementById("postBtn");
        if (postBtn && ["teacher", "professor", "admin"].includes(currentUser.USER_Role.toLowerCase())) {
          postBtn.style.display = "inline-block";
        }
      } else {
        console.error("User not authenticated");
        window.location.href = "index.html";
      }
    })
    .catch(err => console.error(err));
});


// ฟังก์ชันค้นหาคอร์ส
const searchCourses = () => {
    const query = searchInput.value.trim().toLowerCase();
    const filteredCourses = allCourses.filter(course =>
        course.Course_Name.toLowerCase().includes(query) || 
        course.Course_ID.toLowerCase().includes(query)
    );
    displayCourses(filteredCourses); // แสดงคอร์สที่กรองแล้ว
};

// ฟังก์ชันไปยังหน้ารายละเอียดคอร์ส
const goToDetails = (Cid) => {
    window.location.href = `Course_Review_Details.html?CID=${Cid}`;
};

// ตั้งค่าการทำงานของปุ่มค้นหา
searchBtn.addEventListener('click', searchCourses);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchCourses();
});

// โหลดข้อมูลคอร์สเมื่อเริ่มต้น
fetchCourses();
