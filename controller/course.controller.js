const Course = require('../models/course.models');
const DetailTeacher = require('../models/detailTeacher.models');
const CourseApplication = require('../models/courseApplication.models');
const { sanitizeRequest } = require('../utils/sanitizer');
const {
  handleError,
  sendSuccessResponse,
  logControllerAction,
  canAccessCourse,
  checkOwnership,
  checkDuplicate,
  canStudentViewOrEnroll
} = require('../utils/controllerUtils');

// Teacher: Create course
exports.createCourse = async (req, res) => {
  logControllerAction('Create Course', req.user, { body: req.body });
  sanitizeRequest(req);
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError({ name: 'Forbidden', message: 'You must be a teacher with a complete profile.' }, res, 'You must be a teacher with a complete profile.');
  }
  // Prevent duplicate course with the same title for the same teacher
  const existing = await checkDuplicate(Course, { teacher: req.user._id, title: req.body.title });
  if (existing) return handleError({ name: 'Duplicate', message: 'You already have a course with this title.' }, res, 'You already have a course with this title.');
  try {
    const course = new Course({ ...req.body, teacher: req.user._id });
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
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError({ name: 'Forbidden', message: 'You must be a teacher with a complete profile.' }, res, 'You must be a teacher with a complete profile.');
  }
  const course = await Course.findById(req.params.id);
  if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found');
  if (!checkOwnership(course, req.user._id)) return handleError({ name: 'Forbidden', message: 'You do not own this course.' }, res, 'You do not own this course.');
  try {
    Object.assign(course, req.body);
    await course.save();
    sendSuccessResponse(res, course, 'Course updated successfully');
  } catch (err) {
    handleError(err, res, 'Failed to update course');
  }
};

// Teacher: Delete their own course
exports.deleteCourse = async (req, res) => {
  logControllerAction('Delete Course', req.user, { params: req.params });
  sanitizeRequest(req);
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError({ name: 'Forbidden', message: 'You must be a teacher with a complete profile.' }, res, 'You must be a teacher with a complete profile.');
  }
  const course = await Course.findById(req.params.id);
  if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found');
  if (!checkOwnership(course, req.user._id)) return handleError({ name: 'Forbidden', message: 'You do not own this course.' }, res, 'You do not own this course.');
  try {
    await require('../models/courseApplication.models').deleteMany({ course: course._id });
    await course.deleteOne();
    sendSuccessResponse(res, null, 'Course and related enrollments deleted successfully');
  } catch (err) {
    handleError(err, res, 'Failed to delete course');
  }
};

// Teacher: Get their own course
exports.getMyCourse = async (req, res) => {
  logControllerAction('Get My Course', req.user);
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
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  try {
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
  if (!(await canAccessCourse(req, DetailTeacher, Course))) {
    return handleError(
      { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
      res,
      'You must be a teacher with a complete profile.'
    );
  }
  try {
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id }).populate('teacher', 'fullname email');
    if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found or you do not own this course');
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
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  try {
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

// Student: View course by ID
exports.getCourseById = async (req, res) => {
  logControllerAction('Get Course By ID', req.user, { params: req.params });
  if (!canStudentViewOrEnroll(req)) return handleError({ name: 'Forbidden', message: 'Only students can view courses.' }, res, 'Only students can view courses.');
  try {
    const course = await Course.findById(req.params.id).populate('teacher', 'fullname email');
    if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found');
    sendSuccessResponse(res, course, 'Course retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve course');
  }
};

// Student: Enroll in a course
exports.enrollInCourse = async (req, res) => {
  logControllerAction('Enroll In Course', req.user, { params: req.params });
  sanitizeRequest(req);
  if (!canStudentViewOrEnroll(req)) return handleError({ name: 'Forbidden', message: 'Only students can enroll.' }, res, 'Only students can enroll.');
  const course = await Course.findById(req.params.id);
  if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found');
  const existing = await checkDuplicate(CourseApplication, { course: req.params.id, student: req.user._id });
  if (existing) return handleError({ name: 'Duplicate', message: 'You have already enrolled in this course.' }, res, 'You have already enrolled in this course.');
  try {
    const application = new CourseApplication({ course: req.params.id, student: req.user._id });
    await application.save();
    sendSuccessResponse(res, application, 'Enrolled in course successfully', 201);
  } catch (err) {
    handleError(err, res, 'Failed to enroll in course');
  }
};

// Student: Unenroll from a course
exports.unenrollFromCourse = async (req, res) => {
  logControllerAction('Unenroll From Course', req.user, { params: req.params });
  sanitizeRequest(req);
  if (!canStudentViewOrEnroll(req)) return handleError({ name: 'Forbidden', message: 'Only students can unenroll.' }, res, 'Only students can unenroll.');
  const course = await Course.findById(req.params.id);
  if (!course) return handleError({ name: 'NotFound' }, res, 'Course not found');
  const application = await CourseApplication.findOne({ course: req.params.id, student: req.user._id });
  if (!application) return handleError({ name: 'NotFound', message: 'You are not enrolled in this course.' }, res, 'You are not enrolled in this course.');
  try {
    await application.deleteOne();
    sendSuccessResponse(res, null, 'Unenrolled from course successfully');
  } catch (err) {
    handleError(err, res, 'Failed to unenroll from course');
  }
};
