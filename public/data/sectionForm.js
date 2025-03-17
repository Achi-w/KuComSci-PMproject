// Fetch all section forems
export async function fetchSectionForm() {
    console.log('fetch section form');
    
    return fetch('http://localhost:3000/api/sectionform')
      .then(response => response.json())
      .then(data => {
        if (data.status) {
          const nowTime = new Date();
          const filteredData = [];
          for (const curr of data.info) {
            filteredData.push(curr);
          }
          return filteredData;
        }
      })
      .catch(error => console.error("Error:", error));
  }
  
  // Update section status
export async function updateSection(id, status) {
    return fetch(`http://localhost:3000/api/sectionform/status/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionFormStatus: status,
        userId: 1
      })
    })
      .then(response => response.json())
      .then(data => {
        if (!data.status) {
          return 0;
        } else {
          return 1;
        }
      })
      .catch(error => console.error("Error:", error));
  }
  
  // Add student to section form
export async function addNisitSectionForm(id, currentNumber, name) {
    console.log(currentNumber, id, name);
    
    return fetch(`http://localhost:3000/api/sectionform/add`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentNisitNumber: currentNumber,
        sectionFormId: id,
        sectionFormNisitId: name
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.status) {
          return data;
        } else {
          return data;
        }
      })
      .catch(error => console.error("Error:", error));
  }
  
  // Add new section
export async function addNewSection(dataToPut) {
    return fetch(`http://localhost:3000/api/sectionform`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: dataToPut.courseId,
        userId: dataToPut.userId,
        sec: dataToPut.sec,
        sectionFormStartTime: dataToPut.sectionFormStartTime,
        sectionFormMaximumNisit: dataToPut.sectionFormMaximumNisit,
        sectionFormMinimumNisit: dataToPut.sectionFormMinimumNisit,
        sectionFormNisitListName: dataToPut.sectionFormNisitListName,
        who: dataToPut.who
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.status) {
          return {
            status: 1,
          };
        } else {
          return {
            status: 0,
            error_code: data.errorId
          };
        }
      })
      .catch(error => console.error("Error:", error));
  }
  
  // Fetch single section form
export async function fetchSingleSectionForm(id) {
    return fetch(`http://localhost:3000/api/sectionform/id/${id}`)
      .then(response => response.json())
      .then(data => {
        if (data.status) {
          return data.info;
        }
      })
      .catch(error => console.error("Error:", error));
  }
  
  // Fetch not yet accepted section forms
export async function fetchNotYetAcceptSectionForm(id) {
    return fetch(`http://localhost:3000/api/sectionform/teacher/${id}`)
      .then(response => response.json())
      .then(data => {
        if (data.status) {
          return data.info;
        }
      })
      .catch(error => console.error("Error:", error));
  }
  
  // Delete section form
export async function deleteSectionForm(id) {
    return fetch(`http://localhost:3000/api/sectionform/delete/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    })
      .then(response => response.json())
      .then(data => {
        if (data.status) {
          return data.info;
        } else {
          return 0;
        }
      })
      .catch(error => console.error("Error:", error));
  }