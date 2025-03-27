import { fetchCourse } from "../data/course.js";
import { addNisitSectionForm, deleteSectionForm, fetchSingleSectionForm, updateSection } from "../data/sectionForm.js";
import { logout, reauth } from "./utils/auth.js";




const params = new URLSearchParams(window.location.search);
const id = params.get('id');
let userId = '';
console.log(id);

const initial = async() =>{
    let html = '';
    const section = await fetchSingleSectionForm(id)
    
    
    console.log(section);
        
    const course = await fetchCourse(section.Course_ID);

    document.querySelector('#course-name').innerHTML = course.Course_Name; 
    document.querySelector('#course-detail').innerHTML = course.Course_Owner_Name;
    document.querySelector('#course-id').innerHTML = course.Course_ID;
    document.querySelector('#section-nisit-number').innerHTML = section.Current_Nisit_Number + '/' + section.Section_Form_Maximum_Nisit;
    document.querySelector('.minimum-nisit').innerHTML = `จำนวนนิสิตขั้นต่ำ : ${section.Section_Form_Minimum_Nisit}`
    //nisit list rander
    for(const nisit of section.nisitList){
        html += `
            <div class="name">
                <p>${nisit.Section_Form_Nisit_List_Name}</p>
            </div>
        `
    }

    document.querySelector('.name-list').innerHTML = html;


    document.querySelector('#accept-btn').addEventListener('click',async()=>{
       if(section.Section_Form_Minimum_Nisit>section.Current_Nisit_Number){
           return alert('Current Nisit Number still below minimm nisit number')
       }

        document.querySelector('.pop-up').style.display = 'block';
        document.querySelector('.message').innerHTML = 'คุณตกลงที่จะอนุมัติการขอเปิดหมู่เรียนเพิ่มหรือไม่';
       
        document.querySelector('.decline').addEventListener('click',async ()=>{
            document.querySelector('.pop-up').style.display = 'none';
        })

        const acceptBtn = document.querySelector('.accept');
        acceptBtn.replaceWith(acceptBtn.cloneNode(true));
        
        document.querySelector('.accept').addEventListener('click',async ()=>{
            const action = await updateSection(id, '1', userId); 

            if(action === 0){
                document.querySelector('.message').innerHTML = 'มีข้อผิดพลาดเกิดขึ้น';
            }else{
                document.querySelector('.message').innerHTML = `คำขอเปิดหมู่เรียนเพิ่มได้รับการอนุมัติแล้ว`;
                document.querySelector('.decline').style.display = 'none';
                document.querySelector('.accept').addEventListener('click',()=>{
                    window.location.href = 'addSecMain.html';
                })
            }    
        })
       
    });

    document.querySelector('#decline-btn').addEventListener('click',async()=>{
        document.querySelector('.pop-up').style.display = 'block';
        document.querySelector('.message').innerHTML = 'คุณตกลงที่จะปฏิเสธการขอเปิดหมู่เรียนเพิ่มหรือไม่';
        
        document.querySelector('.decline').addEventListener('click',async ()=>{
            document.querySelector('.pop-up').style.display = 'none';
        })

        const acceptBtn = document.querySelector('.accept');
        acceptBtn.replaceWith(acceptBtn.cloneNode(true));
        
        document.querySelector('.accept').addEventListener('click',async ()=>{
            const action = await updateSection(id, '2',userId); 

            if(action === 0){
                document.querySelector('.message').innerHTML = 'มีข้อผิดพลาดเกิดขึ้น';
            }else{
                document.querySelector('.message').innerHTML = `คำขอเปิดหมู่เรียนเพิ่มได้รับการปฏิเสธแล้ว`;
                document.querySelector('.decline').style.display = 'none';
                document.querySelector('.accept').addEventListener('click',()=>{
                    window.location.href = 'addSecMain.html';
                })
            }    
        })
     
     });

    

}

const checkAuth = async()=>{
    const isAuth = await reauth(); 

    if(isAuth.status){
        if(isAuth.info.USER_Role === 'Teacher'){
            document.querySelector('#bookRoom').innerHTML = 'จองห้องและย้ายห้อง';
            document.querySelector('#info-header-title').innerHTML = 'Professor Comsci - ภาควิชาวิทยาการคอมพิวเตอร์';

        }else{
            document.querySelector('#accept-btn').style.display = 'none';
            document.querySelector('#decline-btn').style.display = 'none';

            document.querySelector('#bookRoom').innerHTML = 'ห้องเรียนเเละห้องสอบ';
            document.querySelector('#info-header-title').innerHTML = 'Admin Comsci - ภาควิชาวิทยาการคอมพิวเตอร์';
        }
        document.querySelector('#nisit-name').innerHTML = isAuth.info.USER_Name + ' ' + isAuth.info.USER_Surname;

        console.log('user auth  ok');
        userId = isAuth.info.USER_ID;
        initial();
    }else{
        console.log('user not logged in');
        window.location.href = '/';
    }

}


checkAuth();