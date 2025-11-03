import React, { useState } from 'react';
import axios from 'axios';
import BASE_URL from '../config';

const ApplicationForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    address: '',
    previousAddresses: '',
    city: '',
    state: '',
    zip: '',
    dateOfBirth: '',
    licenseNumber: '',
    licenseState: '',
    licenseExpiration: '',
    experience: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    educationLevel: '',
    schoolName: '',
    graduationYear: '',
    deniedLicense: false,
    suspendedLicense: false,
    stoppedIntoxicated: false,
    testedPositive: false,
    refusedTest: false,
    convictedDrug: false,
    convictedCriminal: false,
    pendingCriminal: false,
    probationStatus: false,
  });
  const [employmentHistory, setEmploymentHistory] = useState([
    { employerName: '', jobTitle: '', startDate: '', endDate: '', reasonForLeaving: '' },
  ]);
  const [noEmploymentHistory, setNoEmploymentHistory] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'file' ? files[0] : value,
    });
  };

  const handleEmploymentChange = (index, e) => {
    const { name, value } = e.target;
    const updatedHistory = [...employmentHistory];
    updatedHistory[index][name] = value;
    setEmploymentHistory(updatedHistory);
  };

  const validateForm = () => {
    const missingFields = [];

    for (const key in formData) {
      if (!formData[key] && key !== 'middleName' && key !== 'additionalDetails' && key !== 'otherTruckExperience' && key !== 'otherTrailerExperience' && key !== 'experience') {
        missingFields.push(key);
      }
    }

    if (!noEmploymentHistory) {
      employmentHistory.forEach((record, index) => {
        for (const field in record) {
          if (!record[field]) {
            missingFields.push(`Employment Record ${index + 1}: ${field}`);
          }
        }
      });
    }

    return missingFields;
  };

  const addEmploymentRecord = () => {
    setEmploymentHistory([
      ...employmentHistory,
      { employerName: '', jobTitle: '', startDate: '', endDate: '', reasonForLeaving: '' },
    ]);
  };

  const removeEmploymentRecord = (index) => {
    const updatedHistory = employmentHistory.filter((_, i) => i !== index);
    setEmploymentHistory(updatedHistory);
  };

  const toggleNoEmploymentHistory = () => {
    setNoEmploymentHistory(!noEmploymentHistory);
    if (!noEmploymentHistory) {
      setEmploymentHistory([]);
    } else {
      setEmploymentHistory([
        { employerName: '', jobTitle: '', startDate: '', endDate: '', reasonForLeaving: '' },
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    const missingFields = validateForm();
    if (missingFields.length > 0) {
      setErrorMessage(`Please fill out all required fields: ${missingFields.join(', ')}`);
      return;
    }

    const formDataToSend = {
      ...formData,
      employmentHistory: employmentHistory,
    };


    try {
      const response = await axios.post(`${BASE_URL}/api/applications/`, formDataToSend, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 201) {
        setSuccessMessage('Application submitted successfully!');
        setFormData({
          firstName: '',
          lastName: '',
          middleName: '',
          email: '',
          phone: '',
          address: '',
          previousAddresses: '',
          city: '',
          state: '',
          zip: '',
          dateOfBirth: '',
          licenseNumber: '',
          licenseState: '',
          licenseExpiration: '',
          deniedLicense: false,
          suspendedLicense: false,
          stoppedIntoxicated: false,
          testedPositive: false,
          refusedTest: false,
          convictedDrug: false,
          convictedCriminal: false,
          pendingCriminal: false,
          probationStatus: false,
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelationship: '',
          educationLevel: '',
          schoolName: '',
          graduationYear: '',
          additionalDetails: '',
        });
        setEmploymentHistory([
          { employerName: '', jobTitle: '', startDate: '', endDate: '', reasonForLeaving: '' },
        ]);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      if (error.response) {
        console.error('Response data:', error.response.data); // Log backend error details
      }
      setErrorMessage('Failed to submit application. Please try again.');
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Driver Application</h1>
      {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Middle Name</label>
          <input
            type="text"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Date of Birth</label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        {/* Address Information */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Present Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Previous Address(es) during last 3 years (FMCSR 391.21 (3)) if same as present, use the same. </label>
          <textarea
            name="previousAddresses"
            value={formData.previousAddresses || ''}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          ></textarea>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">State</label>
          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          >
            <option value="">Select</option>
            <option value="AL">Alabama</option>
            <option value="AK">Alaska</option>
            <option value="AZ">Arizona</option>
            <option value="AR">Arkansas</option>
            <option value="CA">California</option>
            <option value="CO">Colorado</option>
            <option value="CT">Connecticut</option>
            <option value="DE">Delaware</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="HI">Hawaii</option>
            <option value="ID">Idaho</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
            <option value="IA">Iowa</option>
            <option value="KS">Kansas</option>
            <option value="KY">Kentucky</option>
            <option value="LA">Louisiana</option>
            <option value="ME">Maine</option>
            <option value="MD">Maryland</option>
            <option value="MA">Massachusetts</option>
            <option value="MI">Michigan</option>
            <option value="MN">Minnesota</option>
            <option value="MS">Mississippi</option>
            <option value="MO">Missouri</option>
            <option value="MT">Montana</option>
            <option value="NE">Nebraska</option>
            <option value="NV">Nevada</option>
            <option value="NH">New Hampshire</option>
            <option value="NJ">New Jersey</option>
            <option value="NM">New Mexico</option>
            <option value="NY">New York</option>
            <option value="NC">North Carolina</option>
            <option value="ND">North Dakota</option>
            <option value="OH">Ohio</option>
            <option value="OK">Oklahoma</option>
            <option value="OR">Oregon</option>
            <option value="PA">Pennsylvania</option>
            <option value="RI">Rhode Island</option>
            <option value="SC">South Carolina</option>
            <option value="SD">South Dakota</option>
            <option value="TN">Tennessee</option>
            <option value="TX">Texas</option>
            <option value="UT">Utah</option>
            <option value="VT">Vermont</option>
            <option value="VA">Virginia</option>
            <option value="WA">Washington</option>
            <option value="WV">West Virginia</option>
            <option value="WI">Wisconsin</option>
            <option value="WY">Wyoming</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">ZIP Code</label>
          <input
            type="text"
            name="zip"
            value={formData.zip}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        {/* License Information */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Driver's License Number</label>
          <input
            type="text"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">License State</label>
          <select
            name="licenseState"
            value={formData.licenseState}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          >
            <option value="">Select</option>
            <option value="AL">Alabama</option>
            <option value="AK">Alaska</option>
            <option value="AZ">Arizona</option>
            <option value="AR">Arkansas</option>
            <option value="CA">California</option>
            <option value="CO">Colorado</option>
            <option value="CT">Connecticut</option>
            <option value="DE">Delaware</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="HI">Hawaii</option>
            <option value="ID">Idaho</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
            <option value="IA">Iowa</option>
            <option value="KS">Kansas</option>
            <option value="KY">Kentucky</option>
            <option value="LA">Louisiana</option>
            <option value="ME">Maine</option>
            <option value="MD">Maryland</option>
            <option value="MA">Massachusetts</option>
            <option value="MI">Michigan</option>
            <option value="MN">Minnesota</option>
            <option value="MS">Mississippi</option>
            <option value="MO">Missouri</option>
            <option value="MT">Montana</option>
            <option value="NE">Nebraska</option>
            <option value="NV">Nevada</option>
            <option value="NH">New Hampshire</option>
            <option value="NJ">New Jersey</option>
            <option value="NM">New Mexico</option>
            <option value="NY">New York</option>
            <option value="NC">North Carolina</option>
            <option value="ND">North Dakota</option>
            <option value="OH">Ohio</option>
            <option value="OK">Oklahoma</option>
            <option value="OR">Oregon</option>
            <option value="PA">Pennsylvania</option>
            <option value="RI">Rhode Island</option>
            <option value="SC">South Carolina</option>
            <option value="SD">South Dakota</option>
            <option value="TN">Tennessee</option>
            <option value="TX">Texas</option>
            <option value="UT">Utah</option>
            <option value="VT">Vermont</option>
            <option value="VA">Virginia</option>
            <option value="WA">Washington</option>
            <option value="WV">West Virginia</option>
            <option value="WI">Wisconsin</option>
            <option value="WY">Wyoming</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">License Expiration Date</label>
          <input
            type="date"
            name="licenseExpiration"
            value={formData.licenseExpiration}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>
        {/* Education Information */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2">Education Information</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Highest Level of Education</label>
            <select
              name="educationLevel"
              value={formData.educationLevel || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            >
              <option value="">Select</option>
              <option value="High School">High School</option>
              <option value="Associate's Degree">Associate's Degree</option>
              <option value="Bachelor's Degree">Bachelor's Degree</option>
              <option value="Master's Degree">Master's Degree</option>
              <option value="Doctorate">Doctorate</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">School Name</label>
            <input
              type="text"
              name="schoolName"
              value={formData.schoolName || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Graduation Year</label>
            <input
              type="text"
              name="graduationYear"
              value={formData.graduationYear || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
        </div>
        {/* Emergency Contact Information */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2">Emergency Contact Information</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Emergency Contact Name</label>
            <input
              type="text"
              name="emergencyContactName"
              value={formData.emergencyContactName || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Emergency Contact Phone</label>
            <input
              type="text"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Relationship to Emergency Contact</label>
            <input
              type="text"
              name="emergencyContactRelationship"
              value={formData.emergencyContactRelationship || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
        </div>
        {/* Employment History */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2">Employment History (Past 10 Years)</h2>
          <div className="mb-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={noEmploymentHistory}
                onChange={toggleNoEmploymentHistory}
                className="mr-2"
              />
              No Previous Employment History
            </label>
          </div>
          {!noEmploymentHistory && employmentHistory.map((record, index) => (
            <div key={index} className="mb-4 border border-gray-300 p-4 rounded">
              <h3 className="text-md font-semibold mb-2">Employment Record {index + 1}</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Employer Name</label>
                <input
                  type="text"
                  name="employerName"
                  value={record.employerName}
                  onChange={(e) => handleEmploymentChange(index, e)}
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Job Title</label>
                <input
                  type="text"
                  name="jobTitle"
                  value={record.jobTitle}
                  onChange={(e) => handleEmploymentChange(index, e)}
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={record.startDate}
                  onChange={(e) => handleEmploymentChange(index, e)}
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={record.endDate}
                  onChange={(e) => handleEmploymentChange(index, e)}
                  className="w-full border border-gray-300 p-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason for Leaving</label>
                <textarea
                  name="reasonForLeaving"
                  value={record.reasonForLeaving}
                  onChange={(e) => handleEmploymentChange(index, e)}
                  className="w-full border border-gray-300 p-2 rounded"
                ></textarea>
              </div>
              <button
                type="button"
                onClick={() => removeEmploymentRecord(index)}
                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm"
              >
                Delete This Record
              </button>
            </div>
          ))}
          {!noEmploymentHistory && (
            <button
              type="button"
              onClick={addEmploymentRecord}
              className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-sm mt-2"
            >
              Add Another Employment Record
            </button>
          )}
        </div>
        {/* Additional Questions */}
        <div className="mb-4">
          <p className="font-bold">Please read carefully</p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              A. Have you ever been denied a license, permit or privilege to operate a motor vehicle? *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="deniedLicense"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="deniedLicense"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              B. Any license, permit or privilege been suspended or revoked? *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="suspendedLicense"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="suspendedLicense"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              C. Have you ever been stopped while intoxicated? *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="stoppedIntoxicated"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="stoppedIntoxicated"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              D. During the past two (2) years have you tested positive on a Pre-employment alcohol or drug test administered by Employer to which you applied for but did not obtain a Driver position regulated by the DOT drug and alcohol testing rules? *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="testedPositive"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="testedPositive"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              E. During the past two (2) Years have you refused to test on a Pre-employment alcohol or drug test administered by an Employer to which you applied for but did not obtain a Driver position regulated by the DOT drug and alcohol testing rules? *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="refusedTest"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="refusedTest"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              F. Have you ever been convicted for possession of, sale, or use of a narcotic drug, amphetamine, or a derivative thereof? *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="convictedDrug"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="convictedDrug"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              G. Have you ever been convicted of a criminal offense? (A conviction will not necessarily disqualify you from employment.) *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="convictedCriminal"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="convictedCriminal"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              H. Do you currently have any criminal actions pending in which you are a defendant? (A "yes" answer will not necessarily disqualify you from employment.) *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="pendingCriminal"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="pendingCriminal"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              I. Are you currently on probation or parole status? (A "yes" answer will not necessarily disqualify you from employment.) *
            </label>
            <div>
              <label className="mr-4">
                <input
                  type="radio"
                  name="probationStatus"
                  value="Yes"
                  onChange={handleChange}
                  required
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="probationStatus"
                  value="No"
                  onChange={handleChange}
                  required
                />
                No
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              If yes to any of the above questions, state circumstances and dates:
            </label>
            <textarea
              name="additionalDetails"
              value={formData.additionalDetails || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            ></textarea>
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-sm"
        >
          Submit Application
        </button>
        {errorMessage && <p className="text-red-500 mt-4 text-sm">{errorMessage}</p>}
      </form>
    </div>
  );
};

export default ApplicationForm;
