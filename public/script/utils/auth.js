export const reauth = async()=>{
    return fetch(('http://localhost:3000/api/reauth'),{
        method: 'GET',
        credentials: 'include',
    })
        .then(response => response.json())
        .then(data =>{
            if(data.status){                
                return data;
            }else{
                console.log('user not logged in');
                return {
                    status:0
                }
            }
        })
}

export const logout = async()=>{
    return fetch(('http://localhost:3000/logout'),{
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then( data=>{
        console.log(data);
        
        if(data.success){
            return 1;   
        }else{
            return 0;
        }
    }
    )
}