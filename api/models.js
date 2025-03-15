const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    personalInfo: {
      fullName: { type: String, required: true, default: '' },
      profilePhoto: { type: String, required: false, default: '' },
      email: { type: String, required: true, default: '' },
      postcode:{type:String , require:false,default:''},
      englishLevel:{type:String , required:false,default:''},
      location: { type: String, required: true, default: '' },
      address: { type: String, required: true, default: '' },
      phone: { type: String, required: true, default: '' },
  
    },
    rolesSkills: {
      title: { type: String, required: true, default: '' },
      skills: [
        {
          name: { type: String, required: true, default: '' },
        },
      ],
      roles: { type: [String], required: true, default: [] },
    },
    expectations: {
      hourlyRate: { type: String, required: true, default: '' },
      availability: { type: String, required: true, default: '' },
      workPreference: { type: [String], required: true, default: [] },
      rightToWork: { type: String, required: true, default: '' },
      securityClearance: { type: String, required: true, default: '' },
    },
    experiences: [
      {
        title: { type: String, required: false, default: '' },  // Changed to required: false
        company: { type: String, required: false, default: '' }, // Changed to required: false
        startDate: { type: String, required: false, default: '' }, // Changed to required: false
        endDate: { type: String, required: false, default: '' },
        current: { type: Boolean, required: false, default: false },
        description: { type: String, required: false, default: '' },
      },
    ],
    cv: {
      resume: { type: String, required: true, default: '' },
    },
    diversityInclusion: {
      gender: { type: String, required: true, default: '' },
      pronouns: { type: String, required: true, default: '' },
      ethnicity: { type: String, required: true, default: '' },
      disability: { type: String, required: false, default: '' },
      veteranStatus: { type: String, required: false, default: '' },
    },
  });

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    jobs: { type: Array, default: [] },
  
});

 const HiredeasyUserSchema = new mongoose.Schema({
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
            email: { type: String, required: true, unique: true },
            profiles: [ProfileSchema],
        });



module.exports = {
    UserSchema ,ProfileSchema,HiredeasyUserSchema 
}