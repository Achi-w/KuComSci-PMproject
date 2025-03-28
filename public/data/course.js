export const fetchCourse = async(id) => {
    console.log(id);
    const d = await id;
    
    return fetch(`http://localhost:3000/api/courseSec/${d}`)
        .then(response => response.json())
        .then(data => {
            if(data.status){
                return data.info;
            }
        })
        .catch(error => console.error("Error:", error));
}

export const fetchCourseOfTeahcer = async(id) =>{
    return fetch(`http://localhost:3000/api/courseSecTeacher/${id}`)
        .then(response => response.json())
        .then(data => {
            if(data.status){
                return data.info;
            }
        })
        .catch(error => console.error("Error:", error));
}
export const fetchAllCourse = async() => {
    return fetch(`http://localhost:3000/api/allcourse`)
        .then(response => response.json())
        .then(data => {
            if(data.status){
                return data.info;
            }
        })
        .catch(error => console.error("Error:", error));
}