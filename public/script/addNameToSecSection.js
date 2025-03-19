import { fetchCourse } from "../data/course.js";
import { addNisitSectionForm, fetchSingleSectionForm } from "../data/sectionForm.js";
import { logout, reauth } from "./utils/auth.js";

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
let userid = 'U003';
console.log(id);

console.log(id);

const initial = async() =>{

    const section = await fetchSingleSectionForm(id)
    
    console.log(section);
    console.log(section.course_id);
    console.log(section.Current_Nisit_Number);
      
    const course = await fetchCourse(section.Course_ID);

    document.querySelector('#course-name').innerHTML = course.Course_Name; 
    document.querySelector('#course-detail').innerHTML = course.Course_Owner_Name;
    document.querySelector('#course-id').innerHTML = course.Course_ID;



    document.querySelector('#accept-btn').addEventListener('click',async()=>{
     
        if(section.Current_Nisit_Number+1> section.Section_Form_Maximum_Nisit_Number){
            document.querySelector('.pop-up').style.display = 'block';
            document.querySelector('.message').innerHTML = `ขออภัยไม่สามารถลงทะเบียนได้เนื่องจากคนลงทะเบียนเกินจำนวน`;
            
            document.querySelector('.decline').addEventListener('click',async ()=>{
                document.querySelector('.pop-up').style.display = 'none';
            })
    
            
            return
        }
        console.log(section.Current_Nisit_Number);
        let numberToPut = section.Current_Nisit_Number;
        numberToPut += 1;
        console.log(numberToPut);
        
        document.querySelector('.pop-up').style.display = 'block';
        document.querySelector('.message').innerHTML = 'คุณตกลงที่จะลงทะเบียนหรือไม่';
        
        document.querySelector('.decline').addEventListener('click',async ()=>{
            document.querySelector('.pop-up').style.display = 'none';
        })
    
        const acceptBtn = document.querySelector('.accept');
        acceptBtn.replaceWith(acceptBtn.cloneNode(true));
        
        document.querySelector('.accept').addEventListener('click',async ()=>{
            const check = await addNisitSectionForm(id,numberToPut,userid);    
            console.log(check);
            
            if(check.status){
                document.querySelector('.message').innerHTML = 'คุณได้ลงทะเบียนเรียบร้อยแล้ว';
                document.querySelector('.decline').style.display = 'none';

                document.querySelector('.accept').addEventListener('click',()=>{
                    window.location.href = 'addSecMain.html';
                })
            }else{
                if(check.errorCode === 1){
                    document.querySelector('.message').innerHTML = `คุณลงชื่อไปเเล้ว`;
                }else{
                    document.querySelector('.message').innerHTML = `มีข้อผิดพลาดเกิดขึ้น`;
                }
                document.querySelector('.decline').style.display = 'none';

                document.querySelector('.accept').addEventListener('click',()=>{
                    document.querySelector('.pop-up').style.display = 'none';
                    
                })
            }    
        })
      
    })

    document.querySelector('#close-button').addEventListener('click',async()=>{
            const isLogout = await logout();
            if(isLogout){
                window.location.href = '/';
            }else{
                alert('logout failed')
            }
        })
}

const checkAuth = async()=>{
    const isAuth = await reauth(); 

    if(isAuth.status){
        document.querySelector('#nisit-name').innerHTML = isAuth.info.USER_Name + ' ' + isAuth.info.USER_Surname;

        userid = isAuth.info.USER_ID;
        console.log('user auth  ok');
        initial();
    }else{
        console.log('user not logged in');
        window.location.href = '/';
    }

}

checkAuth();


