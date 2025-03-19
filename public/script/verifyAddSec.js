import { fetchCourse } from "../data/course.js";
import { addNisitSectionForm, deleteSectionForm, fetchSingleSectionForm, updateSection } from "../data/sectionForm.js";
import { reauth } from "./utils/auth.js";

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
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

    document.querySelector('#delete-btn').addEventListener('click',async()=>{
        document.querySelector('.pop-up').style.display = 'block';
        document.querySelector('.message').innerHTML = 'คุณต้องการลบคำขอเปิดหมู่เรียนเพิ่มหรือไม่';
    
        document.querySelector('.decline').addEventListener('click',async ()=>{
            document.querySelector('.pop-up').style.display = 'none';
        })

        const acceptBtn = document.querySelector('.accept');
        acceptBtn.replaceWith(acceptBtn.cloneNode(true));
    
    
        document.querySelector('.accept').addEventListener('click',async ()=>{
            const action = await deleteSectionForm(id);
            if(action === 0){
                document.querySelector('.message').innerHTML = 'มีข้อผิดพลาดเกิดขึ้น';
            }else{
                document.querySelector('.message').innerHTML = `คำขอเปิดหมู่เรียนเพิ่มได้รับ
การลบแล้ว`;
                document.querySelector('.decline').style.display = 'none';

                document.querySelector('.accept').addEventListener('click',()=>{
                    window.location.href = 'addSecMain.html';
                })
            }    
        })
    });

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
            const action = await updateSection(id, '1'); 

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
            const action = await updateSection(id, '2'); 

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
        console.log('user auth  ok');
        initial();
    }else{
        console.log('user not logged in');
        window.location.href = '/';
    }

}

checkAuth();