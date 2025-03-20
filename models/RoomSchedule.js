class RoomSchedule{

    constructor(){
        const mysql = require('mysql2');
        this.pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            database: 'pmdatabase4',
            password: ''
        }).promise();
    }

    getCurrentDateTime() {
        const now = new Date();
        
        // Get date components
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(now.getDate()).padStart(2, '0');
        
        // Get time components
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // Format the string
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }

    formatInputDate(inputDate) {
        const [day, month, year] = inputDate.split('/');
        return `${year}-${month}-${day}`;
    }
    
    async addSchedule(room_id, course_id, book_date, start_time, end_time, book_type, sec_number){
        const availability = await this.checkRoomAvailability(room_id, book_date, start_time, end_time);
        if (availability){
            try {
                const formattedStart = `${this.formatInputDate(book_date)} ${start_time}`;
                const formattedEnd = `${this.formatInputDate(book_date)} ${end_time}`
                const now = this.getCurrentDateTime()
                const result = await this.pool.query("INSERT INTO Room_schedule (room_id, course_id, reserve_date, reserve_start_time, reserve_end_time, book_type, sec_number) VALUES (?, ?, ?, ?, ?, ?, ?)", [room_id, course_id, now, formattedStart, formattedEnd, book_type, sec_number])
                return 0;
            } catch (error) {
                console.error('Error inserting data:', error);
                return 2;
            }
        } else{
            return 1;
        }
    }

    async editSchedule(room_schedule_id, room_id, course_id, book_date, start_time, end_time, sec_number){
        const availability = await this.checkRoomAvailability(room_id, book_date, start_time, end_time, room_schedule_id);
        if (availability){
            try {
                const formattedStart = `${this.formatInputDate(book_date)} ${start_time}`;
                const formattedEnd = `${this.formatInputDate(book_date)} ${end_time}`
                const now = this.getCurrentDateTime()
                const result = await this.pool.query('UPDATE Room_schedule set room_id = ?, course_id = ?, reserve_date =?, reserve_start_time =?, reserve_end_time =?, sec_number =? WHERE room_schedule_id = ?', [room_id, course_id, now, formattedStart, formattedEnd, sec_number, room_schedule_id])
                return 0;
            } catch (error) {
                console.error('Error inserting data:', error);
                return 2;
            }
        } else{
            return 1;
        }
    }
    
    async checkRoomAvailability(room_id, book_date, start_time, end_time, room_schedule_id = null){
        const formattedStart = `${this.formatInputDate(book_date)} ${start_time}`;
        const formattedEnd = `${this.formatInputDate(book_date)} ${end_time}`
        try {
            if (room_schedule_id == null){
                const [rows, fields] = await this.pool.query('SELECT reserve_start_time, reserve_end_time FROM room_schedule WHERE room_id = ? AND reserve_end_time > ? AND reserve_start_time < ?', [room_id, formattedStart, formattedEnd]);
                return rows.length === 0;
            }
            else {
                const [rows, fields] = await this.pool.query('SELECT reserve_start_time, reserve_end_time FROM room_schedule WHERE room_id = ? AND reserve_end_time > ? AND reserve_start_time < ? AND room_schedule_id != ?', [room_id, formattedStart, formattedEnd, room_schedule_id]);
                return rows.length === 0;
            }
        } catch (error) {
            console.error('Error checking room availability:', error);
            return false;
        }
    }
    
    async getAvailableRoom(book_date, start_time, end_time, room_schedule_id = null){
        const formattedStart = `${this.formatInputDate(book_date)} ${start_time}`;
        const formattedEnd = `${this.formatInputDate(book_date)} ${end_time}`
        try {
            if (room_schedule_id == null){
                const [rows, fields] =  await this.pool.query('SELECT room_id FROM room WHERE room_id NOT IN (SELECT room_id FROM room_schedule WHERE reserve_end_time > ? AND reserve_start_time < ?)', [formattedStart, formattedEnd]);
                return rows;
            }
            else {
                const [rows, fields] =  await this.pool.query('SELECT room_id FROM room WHERE room_id NOT IN (SELECT room_id FROM room_schedule WHERE reserve_end_time > ? AND reserve_start_time < ? AND room_schedule_id != ?)', [formattedStart, formattedEnd, room_schedule_id]);
                return rows;
            }
        } catch (error) {
            console.error('Error checking room availability:', error);
            return formattedStart, formattedEnd;
        }

    }

    formatDateDisplay(startTime, endTime) {
        // Parse the ISO date strings
        const start = new Date(startTime);
        const end = new Date(endTime);

        
        // Get day of week (abbreviated to 3 letters)
        const dayOfWeek = start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        
        // Get day of month
        const dayOfMonth = start.getDate();
        
        // Get month (abbreviated to 3 letters)
        const month = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        
        // Get year
        const year = start.getFullYear();
        
        // Format times (hours:minutes)
        const startHour = start.getHours().toString().padStart(2, '0');
        const startMinute = start.getMinutes().toString().padStart(2, '0');
        const endHour = end.getHours().toString().padStart(2, '0');
        const endMinute = end.getMinutes().toString().padStart(2, '0');
        
        // Build the formatted strings
        const dateString = `${dayOfWeek} ${dayOfMonth} ${month} ${year}`;
        const timeString = `${startHour}:${startMinute} - ${endHour}:${endMinute}`;
        
        return { dateString, timeString };
      }

    async getRoomSchedule(user_id, book_type, isTeacher = null){
        try {
            const now = this.getCurrentDateTime();
            let user_course_subquery = '';
            if (isTeacher) {
                user_course_subquery = 'SELECT course_id, sec, user_id FROM section_form WHERE user_id = ?';
            } else {
                user_course_subquery = 'SELECT course_id, sec, user_id FROM section_form WHERE section_form_id IN (SELECT section_form_id FROM `section_form_nisit_list` WHERE user_id = ?)';
            }
            const [rows, fields] = await this.pool.query(`SELECT room_schedule_id, room_id, room_schedule.course_id, reserve_date, reserve_start_time, reserve_end_time, course_name, sec_number, CONCAT(user_name, ' ', user_surname) AS full_name  FROM room_schedule JOIN (${user_course_subquery}) as user_course ON room_schedule.course_id = user_course.course_id AND room_schedule.sec_number = user_course.sec JOIN course ON room_schedule.course_id = course.course_id JOIN user ON user_course.user_id = user.user_id WHERE book_type = ? AND reserve_end_time >= ? ORDER BY reserve_start_time`, [user_id,book_type,  now]); 
            const scheduleList = rows.map(row => ({...row, ...this.formatDateDisplay(row.reserve_start_time, row.reserve_end_time)}));
            return scheduleList;
        } catch (error) {
            console.error('Error checking room schedule:', error);
            return null;
        }
    }

    async getRoomList(){
        try {
            const [rows, fields] = await this.pool.query('SELECT room_id FROM room;');
            const roomList = rows;
            return roomList;
        } catch (error) {
            console.error('Error checking room list:', error);
            return null;
        }
    }

    async getCourseList(user_id){
        try {
            const [rows, fields] = await this.pool.query('SELECT course.course_name, section_form.course_id, sec FROM section_form JOIN course ON section_form.course_id = course.course_id WHERE section_form.user_id = ?', [user_id]);
            return rows;
        } catch (error) {
            console.error('Error checking course list:', error);
            return null;
        }
    }

}

module.exports = RoomSchedule;