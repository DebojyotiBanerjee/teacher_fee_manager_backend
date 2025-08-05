const BatchEnrollment = require('../models/batchEnrollment.models');
const { handleError, sendSuccessResponse } = require('../utils/controllerUtils');

exports.getStudentEnrolledBatches = async (req,res)=>{
    try{
        const studentId = req.user._id;
        
        if(!studentId){
            ({ name: 'NotFound' }, res, "Access Token is required");
        }

        const enrollments = await BatchEnrollment.find({student: studentId})
        .populate({
            path:"batch",
            match:{isDeleted: false},
            select:"batchName days time mode",
            populate:{
                path:"course",
                select: "title description"
            }
        })
        .sort({enrolledAt:-1});

        const filteredEnrollments = enrollments.filter(e => e.batch !==null);

        sendSuccessResponse(res,{
            filteredEnrollments
        },"Student's enrolled batches retrieved successfully")
    }catch(error){
        handleError(err, res, "Failed to retrieve enrolled batches")
    }
}