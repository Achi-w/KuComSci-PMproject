export const reauth = async()=>{
    return fetch(('http://localhost:3000/api/reauth'),{
        method: 'GET',
        credentials: 'include',
    })
        .then(response => response.json())
        .then(data =>{
            if(data.status){
                
                console.log(data);
                return data;
            }else{
                console.log('user not logged in');
                return {
                    status:0
                }
            }
        })
}