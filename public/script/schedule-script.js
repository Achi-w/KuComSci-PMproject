const toBookFormButton = document.getElementById("to-book-form")

if (toBookFormButton) {
    toBookFormButton.addEventListener("click", function() {
        // Redirect to the room booking page

        if (bookType == 'study_room') {
            document.location.href = "/roomBooking/bookStudyRoom";
            console.log("Study Room Booking");
        }
        else if (bookType == 'midterm_room') {
            document.location.href = "/roomBooking/bookMidtermRoom";
        }
        else if (bookType == 'final_room') {
            document.location.href = "/roomBooking/bookFinalRoom";
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
        // Get the schedule ID from the button's ID
        const buttonId = this.id;
        const scheduleId = buttonId.split('_')[0];
        
        // Extract schedule information using the ID
        const scheduleInfo = {
            id: scheduleId,
            date: document.getElementById(`${scheduleId}_date`).textContent,
            courseName: document.getElementById(`${scheduleId}_coursename`).textContent,
            time: document.getElementById(`${scheduleId}_time`).textContent,
            courseId: document.getElementById(`${scheduleId}_courseid`).textContent.replace('รหัสวิชา ', ''),
            secNumber: document.getElementById(`${scheduleId}_studentcount`).textContent.replace('หมู่เรียน ', '')
        };
        
        
        const encodedData = encodeURIComponent(JSON.stringify(scheduleInfo));
        if (bookType == 'study_room') {
            window.location.href = `/roomBooking/editStudyRoom?data=${encodedData}`;
        } else if (bookType == 'midterm_room') {
            window.location.href = `/roomBooking/editMidtermRoom?data=${encodedData}`;
        } else if (bookType == 'final_room') {
            window.location.href = `/roomBooking/editFinalRoom?data=${encodedData}`;
        }
        });
    })
});





