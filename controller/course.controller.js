const Course = require('../models/course.models');
const DetailTeacher = require('../models/detailTeacher.models');
const CourseApplication = require('../models/courseApplication.models');
const { sanitizeRequest } = require('../utils/sanitizer');
const {
  handleError,
  sendSuccessResponse,
  logControllerAction,
  canAccessCourse,  
  checkDuplicate,
  canStudentViewOrEnroll,
  isOwner,
  softDelete
} = require('../utils/controllerUtils');

// Teacher: Create course
exports.createCourse = async (req, res) => {
  logControllerAction('Create Course', req.user, { body: req.body });
  sanitizeRequest(req);
  
  // Destructure request body for clear testing
  const { title, subtitle, description, prerequisites, fee, duration, syllabus } = req.body;
  
  if (req.user.role !== 'teacher') {
    return handleError({ name: 'Forbidden', message: 'Only teachers can create courses.' }, res, 'Only teachers can create courses.');
  }
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError({ name: 'Forbidden', message: 'You must be a teacher with a complete profile.' }, res, 'You must be a teacher with a complete profile.');
  }
  // Prevent duplicate course with the same title for the same teacher
  const existing = await checkDuplicate(Course, { teacher: req.user._id, title });
  if (existing) return handleError({ name: 'Duplicate', message: 'You already have a course with this title.' }, res, 'You already have a course with this title.');
  try {
    const course = new Course({ 
      title, 
      subtitle, 
      description, 
      prerequisites, 
      fee, 
      duration, 
      syllabus, 
      teacher: req.user._id 
    });
    await course.save();
    sendSuccessResponse(res, course, 'Course created successfully', 201);
  } catch (err) {
    handleError(err, res, 'Failed to create course');
  }
};

// Teacher: Update their own course
exports.updateCourse = async (req, res) => {
  logControllerAction('Update Course', req.user, { body: req.body, params: req.params });
  sanitizeRequest(req);
  
  // Destructure request body for clear testing
  const { title, subtitle, description, prerequisites, fee, duration, syllabus, teacher } = req.body;
  
  if (req.user.role !== 'teacher') {
    return handleError({ name: 'Forbidden', message: 'Only teachers can update courses.' }, res, 'Only teachers can update courses.');
  }
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError({ name: 'Forbidden', message: 'You must be a teacher with a complete profile.' }, res, 'You must be a teacher with a complete profile.');
  }
  const course = await Course.findById(req.params.id);
  if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found');
  if (!isOwner(course, req.user._id)) return handleError({ name: 'Forbidden', message: 'You do not own this course.' }, res, 'You do not own this course.');
  try {
    // If teacher is provided as a name, resolve to _id
    let teacherId = teacher;
    if (teacher && typeof teacher === 'string' && !teacher.match(/^[0-9a-fA-F]{24}$/)) {
      const User = require('../models/user.models');
      const teacherUser = await User.findOne({ fullname: teacher, role: 'teacher' });
      if (!teacherUser) {
        return handleError({ name: 'NotFound', message: 'Teacher with this name not found.' }, res, 'Teacher with this name not found.');
      }
      teacherId = teacherUser._id;
    }
    
    // Prepare update data
    const updateData = {
      title, subtitle, description, prerequisites, fee, duration, syllabus
    };
    if (teacherId) updateData.teacher = teacherId;
    
    // Use findOneAndUpdate for better performance - single query with population
    const updatedCourse = await Course.findOneAndUpdate(
      { _id: req.params.id },
      updateData,
      { 
        new: true, // Return the updated document
        runValidators: true // Run schema validators
      }
    ).populate('teacher', 'fullname email');
    
    sendSuccessResponse(res, updatedCourse, 'Course updated successfully');
  } catch (err) {
    handleError(err, res, 'Failed to update course');
  }
};

// Teacher: Delete their own course
exports.deleteCourse = async (req, res) => {
  logControllerAction('Delete Course', req.user, { params: req.params });
  sanitizeRequest(req);
  if (req.user.role !== 'teacher') {
    return handleError({ name: 'Forbidden', message: 'Only teachers can delete courses.' }, res, 'Only teachers can delete courses.');
  }
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError({ name: 'Forbidden', message: 'You must be a teacher with a complete profile.' }, res, 'You must be a teacher with a complete profile.');
  }
  const course = await Course.findOne({ _id: req.params.id, isDeleted: false });
  if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found');
  if (!isOwner(course, req.user._id)) return handleError({ name: 'Forbidden', message: 'You do not own this course.' }, res, 'You do not own this course.');
  try {
    await require('../models/courseApplication.models').deleteMany({ course: course._id });
    await softDelete(Course, { _id: req.params.id });
    sendSuccessResponse(res, null, 'Course and related enrollments deleted successfully');
  } catch (err) {
    handleError(err, res, 'Failed to delete course');
  }
};

// Teacher: Get their own course
exports.getMyCourse = async (req, res) => {
  logControllerAction('Get My Course', req.user);
  if (req.user.role !== 'teacher') {
    return handleError({ name: 'Forbidden', message: 'Only teachers can view their courses.' }, res, 'Only teachers can view their courses.');
  }
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError(
      { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
      res,
      'You must be a teacher with a complete profile.'
    );
  }

  // Pagination
  const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
  const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
  const skip = (page - 1) * limit;

  // Filtering
  const filter = { teacher: req.user._id };
  if (req.query.feeMin) filter.fee = { ...filter.fee, $gte: Number(req.query.feeMin) };
  if (req.query.feeMax) filter.fee = { ...filter.fee, $lte: Number(req.query.feeMax) };
  if (req.query.duration) filter.duration = req.query.duration;
  if (req.query.title) filter.title = { $regex: req.query.title, $options: 'i' };

  // Sorting
  // Supports: ?sortBy=duration&sortOrder=desc or ?sortBy=fee&sortOrder=desc for high-to-low
  let sortBy = req.query.sortBy || 'createdAt';
  let sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  let sort = { [sortBy]: sortOrder };
  if ((sortBy === 'duration' || sortBy === 'fee') && sortOrder === -1) {
    // Explicitly sort high to low
    sort = { [sortBy]: -1 };
  }

  try {
    filter.isDeleted = false;
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('teacher', 'fullname email')
        .select('title subtitle description prerequisites fee duration syllabus teacher')
        .skip(skip)
        .limit(limit)
        .sort(sort),
      Course.countDocuments(filter)
    ]);
    sendSuccessResponse(
      res,
      {
        courses,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      'Courses retrieved successfully'
    );
  } catch (err) {
    handleError(err, res, 'Failed to retrieve your courses');
  }
};

// Teacher: View their own course by ID
exports.getMyCourseById = async (req, res) => {
  logControllerAction('Get My Course By ID', req.user, { params: req.params });
  if (req.user.role !== 'teacher') {
    return handleError({ name: 'Forbidden', message: 'Only teachers can view their course.' }, res, 'Only teachers can view their course.');
  }
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError(
      { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
      res,
      'You must be a teacher with a complete profile.'
    );
  }
  try {
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id, isDeleted: false }).populate('teacher', 'fullname email');
    if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found or you do not own this course');
    // if (!isOwner(course, req.user._id)) return handleError({ name: 'Forbidden', message: 'You do not own this course.' }, res, 'You do not own this course.');
    sendSuccessResponse(res, course, 'Course retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve course');
  }
};

// Student: View all courses
exports.getAllCourses = async (req, res) => {
  logControllerAction('Get All Courses', req.user);
  if (!canStudentViewOrEnroll(req)) {
    return handleError(
      { name: 'Forbidden', message: 'Only students can view courses.' },
      res,
      'Only students can view courses.'
    );
  }
  // Pagination
  const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
  const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
  const skip = (page - 1) * limit;

  // Filtering
  const filter = {};
  if (req.query.feeMin) filter.fee = { ...filter.fee, $gte: Number(req.query.feeMin) };
  if (req.query.feeMax) filter.fee = { ...filter.fee, $lte: Number(req.query.feeMax) };
  if (req.query.duration) filter.duration = req.query.duration;
  if (req.query.teacher) filter.teacher = req.query.teacher;
  if (req.query.title) filter.title = { $regex: req.query.title, $options: 'i' };

  // Sorting
  // Supports: ?sortBy=duration&sortOrder=desc or ?sortBy=fee&sortOrder=desc for high-to-low
  let sortBy = req.query.sortBy || 'createdAt';
  let sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  let sort = { [sortBy]: sortOrder };
  if ((sortBy === 'duration' || sortBy === 'fee') && sortOrder === -1) {
    // Explicitly sort high to low
    sort = { [sortBy]: -1 };
  }

  try {
    filter.isDeleted = false;
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('teacher', 'fullname email')
        .select('title subtitle description prerequisites fee duration syllabus teacher createdAt updatedAt')
        .skip(skip)
        .limit(limit)
        .sort(sort),
      Course.countDocuments(filter)
    ]);
    sendSuccessResponse(
      res,
      {
        courses,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      'Courses retrieved successfully'
    );
  } catch (err) {
    handleError(err, res, 'Failed to retrieve courses');
  }
};

// Student: View a specific course by ID
exports.getCourseById = async (req, res) => {
  logControllerAction('Get Course By ID', req.user, { params: req.params });
  sanitizeRequest(req);
  
  if (!canStudentViewOrEnroll(req)) {
    return handleError(
      { name: 'Forbidden', message: 'Only students can view courses.' },
      res,
      'Only students can view courses.'
    );
  }
  
  // Validate course ID format
  if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return handleError({ name: 'ValidationError', message: 'Invalid course ID format.' }, res, 'Invalid course ID format');
  }
  
  try {
    const course = await Course.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
    .populate('teacher', 'fullname email')
    .select('title subtitle description prerequisites fee duration syllabus teacher createdAt updatedAt');
    
    if (!course) {
      return handleError({ name: 'NotFound' }, res, 'Course not found');
    }
    
    // Check if student is already enrolled in this course
    const isEnrolled = await CourseApplication.exists({ 
      course: req.params.id, 
      student: req.user._id 
    });
    
    // Get enrollment count for this course
    const enrollmentCount = await CourseApplication.countDocuments({ 
      course: req.params.id 
    });
    
    // Prepare response with additional metadata
    const courseData = course.toObject();
    const responseData = {
      ...courseData,
      isEnrolled: !!isEnrolled,
      enrollmentCount,
      canEnroll: !isEnrolled // Students can enroll if not already enrolled
    };
    
    sendSuccessResponse(res, responseData, 'Course retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve course');
  }
};



// Student: Enroll in a course
exports.enrollInCourse = async (req, res) => {
  logControllerAction('Enroll In Course', req.user, { params: req.params, body: req.body });
  sanitizeRequest(req);  
    
  // Get courseId from URL params (primary) or request body (fallback)
  const courseId = req.params.id || (req.body && req.body.courseId);
  
  if (!canStudentViewOrEnroll(req)) return handleError({ name: 'Forbidden', message: 'Only students can enroll.' }, res, 'Only students can enroll.');
  
  if (!courseId) {
    return handleError({ 
      name: 'ValidationError', 
      message: 'Course ID is required. Provide it in URL params or request body.' 
    }, res, 'Course ID is required');
  }
  
  const course = await Course.findById(courseId);
  if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found');
  
  const existing = await checkDuplicate(CourseApplication, { course: courseId, student: req.user._id });
  if (existing) return handleError({ name: 'Duplicate', message: 'You have already enrolled in this course.' }, res, 'You have already enrolled in this course.');
  
  try {
    // Create course application 
    const applicationData = { 
      course: courseId, 
      student: req.user._id 
    };    
    
    const application = new CourseApplication(applicationData);
    await application.save();
    
    // Populate the response with course and student details
    const populatedApplication = await CourseApplication.findById(application._id)
      .populate('course', 'title subtitle description fee duration')
      .populate('student', 'fullname email phone');
    
    // Get the enrollStudent virtual field
    const enrollmentData = populatedApplication.enrollStudent;
    
    // Combine enrollment data with populated course and student info
    const responseData = {
      ...enrollmentData,
      course: {       
        title: populatedApplication.course.title,        
        fee: populatedApplication.course.fee,
        duration: populatedApplication.course.duration
      },
      student: {
        name: populatedApplication.student.fullname,        
      }
    };
    
    sendSuccessResponse(res, responseData, 'Enrolled in course successfully', 201);
  } catch (err) {
    handleError(err, res, 'Failed to enroll in course');
  }
};

