import { fetchAllCourse, fetchCourse, fetchCourseOfTeahcer } from "../data/course.js"
import { addNewSection } from "../data/sectionForm.js";
import { logout, reauth } from "./utils/auth.js";

let userRole = 1; // 1 = teacher 0 = student
let userid = '';
const initial = async()=>{
    let courseDetail = document.querySelector('#course-detail').innerHTML;
    let courseId = document.querySelector('#course-id').innerHTML;


    let htmlSelect = `
        <option value="0">รายวิชาที่ต้องการเปิด</option>
    `;

    let courses = [];
    if(userRole === 1){
        courses = await fetchCourseOfTeahcer(userid);
    }else{
        courses = await fetchAllCourse();
    }
    
    for(const course of courses){
        htmlSelect += `
        <option value="${course.Course_ID}">${course.Course_Name}</option>
        `

    }

    document.querySelector('#courseSelect').innerHTML = htmlSelect;
    
    
    document.querySelector('#acceptBtn').addEventListener('click',async()=>{
        console.log(document.querySelector('#numberNisit').value);
        console.log(document.querySelector('#numberNisitMin').value);
        const maxNisit = document.querySelector('#numberNisit').value;
        const minNisit = document.querySelector('#numberNisitMin').value;
        console.log(document.querySelector('#courseSelect').value);
        
        if(document.querySelector('#courseSelect').value === '0' || !document.querySelector('#numberNisit').value || !document.querySelector('#secInput').value || !document.querySelector('#numberNisitMin').value){
            return alert('Please fill all field');
        }else if(minNisit < 1 || maxNisit < 1 || document.querySelector('#secInput').value < 1){
            return alert('จำนวนต้องไม่ต่ำกว่่า 1');
        }else if(parseInt(maxNisit)<parseInt(minNisit)){
            return  alert('maximum cannot be less than minimum')
        }


        const course = await fetchCourse(document.querySelector('#courseSelect').value)
        console.log(course, document.querySelector('#numberNisit').value,document.querySelector('#secInput').value);
        
        console.log(typeof minNisit);
        console.log(typeof maxNisit);
        console.log(maxNisit<minNisit);
        
        console.log(course);
        
        
        

        
        const nowDate = new Date();
        
        const dataToSend = {
            courseId:course.Course_ID,
            userId:userid,
            sec:document.querySelector('#secInput').value,
            sectionFormStartTime: nowDate,
            sectionFormMaximumNisit: document.querySelector('#numberNisit').value,
            sectionFormMinimumNisit: document.querySelector('#numberNisitMin').value,
            sectionFormNisitListName: userid,
            who:userRole
        }   

        
        document.querySelector('.pop-up').style.display = 'block';
        document.querySelector('.message').innerHTML = 'คุณตกลงที่จะสร้างคำขอเปิดหมู่เรียนเพิ่มหรือไม่';
        
        document.querySelector('.decline').addEventListener('click',async ()=>{
            document.querySelector('.pop-up').style.display = 'none';
        },{ once: true })

        const acceptBtn = document.querySelector('.accept');
        acceptBtn.replaceWith(acceptBtn.cloneNode(true));
        

        document.querySelector('.accept').addEventListener('click',async ()=>{
            console.log('make sec');
            
            const add = await addNewSection(dataToSend);
            console.log(add);
            
            if(add.status){
                
                document.querySelector('.message').innerHTML = 'ข้อมูลคำขอเปิดหมู่เรียนเพิ่มได้ถูกสร้างแล้ว';            
                document.querySelector('.decline').style.display = 'none';
                document.querySelector('.accept').addEventListener('click',()=>{
                    window.location.href = 'addSecMain.html';
                })
            }else{
                if(add.error_code === 1){
                    document.querySelector('.message').innerHTML = `Sec มีถูกใช้เเล้ว`;            
                    document.querySelector('.decline').style.display = 'none';
                    document.querySelector('.accept').addEventListener('click',()=>{
                        document.querySelector('.pop-up').style.display = 'none';
                        document.querySelector('.decline').style.display = 'block';
                        
                    })

                }else{
                    document.querySelector('.message').innerHTML = `ข้อมูลคำขอเปิดหมู่เรียนเพิ่ม
ได้ถูกสร้างแล้ว`;            
                    document.querySelector('.decline').style.display = 'none';
                    document.querySelector('.accept').addEventListener('click',()=>{
                        window.location.href = 'addSecMain.html';
                    })
    
                }

            }    
        },{ once: true })
        
    })
    
    document.querySelector('#courseSelect').addEventListener('change',async()=>{
        console.log(document.querySelector('#courseSelect').value);
        
        if(document.querySelector('#courseSelect').value === '0'){
            return ;
        }else{
            const course = await fetchCourse(document.querySelector('#courseSelect').value)
            console.log(course);
            
            document.querySelector('#course-detail').innerHTML = course.Course_Owner_Name;
            document.querySelector('#course-id').innerHTML = course.Course_ID;
            
        }
    })


}

const checkAuth = async()=>{
    const isAuth = await reauth(); 

    if(isAuth.status){
        if(isAuth.info.USER_Role === 'Teacher' || isAuth.info.USER_Role === 'Admin'){
            if(isAuth.info.USER_Role === 'Teacher'){
                document.querySelector('#info-header-title').innerHTML = 'Professor Comsci - ภาควิชาวิทยาการคอมพิวเตอร์';
                document.querySelector('#bookRoom').innerHTML = 'จองห้องและย้ายห้อง';
                userRole = 1;
            }else{
                document.querySelector('#info-header-title').innerHTML = 'Admin Comsci - ภาควิชาวิทยาการคอมพิวเตอร์';
                document.querySelector('#bookRoom').innerHTML = 'ห้องเรียนเเละห้องสอบ';
                userRole = 2;

            }

            userid = isAuth.info.USER_ID;
        }else{
            document.querySelector('#bookRoom').innerHTML = 'ห้องเรียนเเละห้องสอบ';
            userRole =0;
            userid = isAuth.info.USER_ID;
        }
        console.log('user auth  ok');

        document.querySelector('#nisit-name').innerHTML = isAuth.info.USER_Name + ' ' + isAuth.info.USER_Surname;
        initial();
    }else{
        console.log('user not logged in');
        window.location.href = '/';
    }

}

checkAuth();

