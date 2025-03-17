export const checkExpriedForm = (formDate) =>{
    const tenDate = new Date();
    tenDate.setDate(tenDate.getDate()+10)
    
    if(formDate<tenDate){
        return 1;
    }else{
        return 0;
    }
    
}