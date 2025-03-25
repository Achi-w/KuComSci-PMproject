import { fetchCourse, fetchAllCourse } from "../data/course.js";
import { fetchNotYetAcceptSectionForm, fetchSectionForm } from "../data/sectionForm.js"
import { logout, reauth } from "./utils/auth.js";
import { checkExpriedForm } from "./utils/date.js";



let userRole = 1; //0 is student 1 is teacher
let userID = 0;



const checkRole = (id,status) =>{
    console.log('check role');
    console.log(id,status);
    
    
    //check role
    if(status=== 'Accept' || status === 'Decline'){
        return ``;
    }

    if(userRole === 0){
        return `
        <a id='link' href='/addNameToSec.html?id=${id}'>
        `;
    }else if(userRole ===1 || userRole ===2){
        return `
        <a id='link' href='/vertifyAddSec.html?id=${id}'>
        `;
    }
    
}


const initial = async ()=>{
    console.log(userRole);
    
    //render initial
    let html = '';

    let sections ='';
    console.log(userRole);
    
    if(userRole === 0){
        sections = await fetchSectionForm();    
    }else{
        if(userRole === 2){
            sections = await fetchNotYetAcceptSectionForm('admin');
        }else{
            console.log('teacher');
        
            sections = await fetchNotYetAcceptSectionForm(userID); //use userid here for techer    
        }
    }
    
    console.log(sections);
    
    for(const section of sections){
        //const dateTest = new Date(section.Section_Form_start_time);
        //
        //if(!checkExpriedForm(dateTest)){
        //    continue;
        //}
        console.log(section);
        
        console.log(section.Course_ID);
        
        const course = await fetchCourse(section.Course_ID);

        console.log(course);
        
        let status = '';
        console.log(section.Section_Form_STATUS === 'Open');
        
        if(section.Section_Form_STATUS === '0' || section.Section_Form_STATUS === 'Open'){
            status = 'waiting for confirm';
        }else if(section.Section_Form_STATUS === '1'){
            status = 'Accept';
        }else if(section.Section_Form_STATUS === '2'){
            status = 'Decline';
        }else{
            status = 'unknown';
        }

        
        //check role
        const navigate = checkRole(section.Section_Form_ID,status);
        
       
        html += `
            ${navigate}
                <div class="sec">
                    <div class="sec-upper">
                        <p class="text-sec">${course.Course_Name}</p>
                        <p class="text-sec">${section.Current_Nisit_Number}/${section.Section_Form_Maximum_Nisit}</p>
                    </div>
                    <div class="sec-middle">
                        <p  class="text-sec">${course.Course_Owner_Name}</p>
                        <p class="text-sec">Sec : ${section.SEC}</p>
                        <p  class="text-sec">เริ่ม : ${section.Section_Form_start_time.slice(0,10)}</p>
                    </div>
                    <div class="sec-bottom">
                        <p  class="text-sec">${course.Course_ID}</p>
                        <p  class="text-sec">สถานะ : ${status}</p>
                    </div>
                </div>
            
        `
    
    }

    document.querySelector('.sec-list').innerHTML = html;

    //render initial end



    document.querySelector('.allSubjectBtn').addEventListener('click',async ()=>{
        let html = '';
        let sections ='';
        console.log('get all');
        
        if(userRole === 0){
            sections = await fetchSectionForm();
        }else{
            if(userRole === 2){
                console.log('sections enter admin');
                
                sections = await fetchNotYetAcceptSectionForm('admin');
            }else{
                sections = await fetchNotYetAcceptSectionForm(userID);

            }
        }

        console.log(sections);
        
        for(const section of sections){
            console.log(section.Course_ID);

            const course = await fetchCourse(section.Course_ID);

            console.log(course);

            let status = '';

            if(section.Section_Form_STATUS === '0'){
                status = 'waiting for confirm';
            }else if(section.Section_Form_STATUS === '1'){
                status = 'Accept';
            }else if(section.Section_Form_STATUS === '2'){
                status = 'Decline';
            }else{
                status = 'unknown';
            }

            console.log(course.Course_Name, course.Course_ID,status);

                    //check role
            const navigate = checkRole(section.Section_Form_ID,status);


            html += `
            ${navigate}
                <div class="sec">
                    <div class="sec-upper">
                        <p class="text-sec">${course.Course_Name}</p>
                        <p class="text-sec">${section.Current_Nisit_Number}/${section.Section_Form_Maximum_Nisit}</p>
                    </div>
                    <div class="sec-middle">
                        <p  class="text-sec">${course.Course_Owner_Name}</p>
                        <p class="text-sec">Sec : ${section.SEC}</p>
                        <p class="text-sec">เริ่ม : ${section.Section_Form_start_time.slice(0,10)}</p>
                    </div>
                    <div class="sec-bottom">
                        <p class="text-sec">${course.Course_ID}</p>
                        <p class="text-sec">สถานะ : ${status}</p>
                    </div>
                </div>
            </a>
        `

        }
        document.querySelector('.sec-list').innerHTML = html;
        
    })


    const checkNameResult =(curr,keyword)=>{
        return curr.courseName === keyword
    }

    document.querySelector('#searchBar').addEventListener('input',async()=>{
        let htmlSearch = '';
        console.log('serach keyword');
        
        
        const searchText = document.querySelector('#searchBar').value;
        
        console.log('keyword ', searchText);
        
        let sections ='';
        if(userRole === 0){
            sections = await fetchSectionForm();
        }else{
            if(userRole === 2){
                sections = await fetchNotYetAcceptSectionForm('admin');
            }else{
                sections = await fetchNotYetAcceptSectionForm(userID);
            }
        }

        console.log(sections);
        
        for(const section of sections){
            console.log(section.course_id);
            
            const course = await fetchCourse(section.Course_ID);
            section.courseName = course.Course_Name;
            section.courseDetail = course.Course_Detail;
            section.courseOwnerName = course.Course_Owner_Name;            
        }

        //const filteredSection =[];
        //for(const section of sections){
        //    if(section.courseName.includes(searchText)){
        //        filteredSection.push(section);
        //    }
        //}
        let filteredSection = sections.filter(curr=> curr.courseName.includes(searchText));
        console.log(filteredSection);
        
        if(filteredSection.length < 1){
            console.log('enter');
            
            filteredSection = sections.filter(curr=> curr.Course_ID.includes(searchText));
        }
        if(filteredSection.length < 1 ){
            filteredSection = sections.filter(curr=> curr.courseOwnerName.includes(searchText));
        }
        console.log(filteredSection);
        
        for(const section of filteredSection){       
            console.log(section);
                 
            let status = '';
            
            if(section.Section_Form_STATUS === '0'){
                status = 'waiting for confirm';
            }else if(section.Section_Form_STATUS === '1'){
                status = 'Accept';
            }else if(section.Section_Form_STATUS === '2'){
                status = 'Decline';
            }else{
                status = 'unknown';
            }
        
            //check role
            const navigate = checkRole(section.Section_Form_ID,status);

            htmlSearch += `
            ${navigate}
                <div class="sec">
                    <div class="sec-upper">
                        <p class="text-sec">${section.courseName}</p>
                        <p class="text-sec">${section.Current_Nisit_Number}/${section.Section_Form_Maximum_Nisit}</p>
                    </div>
                    <div class="sec-middle">
                        <p  class="text-sec">${section.courseOwnerName}</p>
                        <p class="text-sec">Sec : ${section.SEC}</p>
                        <p class="text-sec">เริ่ม : ${section.Section_Form_start_time.slice(0,10)}</p>
                    </div>
                    <div class="sec-bottom">
                        <p class="text-sec">${section.Course_ID}</p>
                        <p class="text-sec">สถานะ : ${status}</p>
                    </div>                    
                </div>
            </a>
        `
            
        }
        document.querySelector('.sec-list').innerHTML = htmlSearch;
        
    })

  
}

const checkAuth = async()=>{
    const isAuth = await reauth(); 

    if(isAuth.status){
        if(isAuth.info.USER_Role === 'Teacher'){
            document.querySelector('#bookRoom').innerHTML = 'จองห้องและย้ายห้อง';
            document.querySelector('#info-header-title').innerHTML = 'Professor Comsci - ภาควิชาวิทยาการคอมพิวเตอร์';
            
            userRole = 1
            userID = isAuth.info.USER_ID;
        }else if( isAuth.info.USER_Role === 'Admin'){
            document.querySelector('#bookRoom').innerHTML = 'ห้องเรียนเเละห้องสอบ';
            document.querySelector('#info-header-title').innerHTML = 'Admin - ภาควิชาวิทยาการคอมพิวเตอร์';
            
            userRole = 2
            userID = isAuth.info.USER_ID;
        }else{
            document.querySelector('#info-header-title').innerHTML = 'Nisit Comsci - ภาควิชาวิทยาการคอมพิวเตอร์';
            document.querySelector('#bookRoom').innerHTML = 'ห้องเรียนเเละห้องสอบ';
            
            userRole = 0
            userID = isAuth.info.USER_ID;
        }

        document.querySelector('#nisit-name').innerHTML = isAuth.info.USER_Name + ' ' + isAuth.info.USER_Surname;
        console.log('user auth  ok');
        initial();
    }else{
        console.log('user not logged in');
        window.location.href = '/';
    }

}

checkAuth();
