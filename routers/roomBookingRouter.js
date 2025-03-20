const express = require('express');
const router = express.Router();
const RoomBookController = require('../controllers/roomBookController')
const controller = new RoomBookController()

router.get('/', (req, res) => {
    controller.renderSchedule(req, res, 0)
})

router.get('/studyRoom', (req, res) => {
    controller.renderSchedule(req, res, 0)
})

router.get('/midtermRoom', (req, res) => {
    controller.renderSchedule(req, res, 1)
})

router.get('/finalRoom', (req, res) => {
    controller.renderSchedule(req, res, 2)
})


router.get('/bookStudyRoom', (req, res) => {
    controller.renderForm(req, res, 0, 'add')
})

router.get('/bookMidtermRoom', (req, res) => {
    controller.renderForm(req, res, 1, 'add')
})

router.get('/bookFinalRoom', (req, res) => {
    controller.renderForm(req, res, 2, 'add')
})

router.get('/editStudyRoom', (req, res) => {
    controller.renderForm(req, res, 0, 'edit')
})

router.get('/editMidtermRoom', (req, res) => {
    controller.renderForm(req, res, 1, 'edit')
})

router.get('/editFinalRoom', (req, res) => {
    controller.renderForm (req, res, 2, 'edit')
})

router.post('/getAvailableRoom', (req, res) => {
    controller.handleGetAvailableRoom(req, res)
})

router.post('/addSchedule', (req, res) => {
    controller.handleAddSchedule(req, res)
})

router.post('/editSchedule', (req, res) => {
    controller.handleEditSchedule(req, res)
})


module.exports = router