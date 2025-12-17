// import { Client } from "@org/db";
import bcrypt from 'bcrypt';
import { Agent, Client } from '@org/db';

import { uploadFileToS3 } from '@org/utils';
// Get Customer Profile
export const getCustomerProfile = async (req, res) => {
  try {
    // console.log("bkc" ,req.user)
    const customerId = req.user.id; 

    const customer = await Client.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};







/**
 * Update client profile
 * @route PUT /api/clients/profile
 */
export const updateCustomerProfile = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { name, email, phoneNumber, address, profile } = req.body;


     // Initialize update data
     const updateData = {
      name: name ,
      email: email,
      phoneNumber: phoneNumber ,
      address: {
        street: address?.street,
        city: address?.city ,
        state: address?.state ,
        postalCode: address?.postalCode ,
        country: address?.country ,
      },
      profile: {
        bio: profile?.bio ,
        profilePicture: profile?.profilePicture,
      },
      updatedAt: new Date(),
    };

    // Check email uniqueness if being updated
    if (email) {
      const existingClient = await Client.findOne({ 
        email, 
        _id: { $ne: clientId } 
      });
      
      if (existingClient) {
        return res.status(400).json({ 
          message: 'Email is already in use' 
        });
      }
    }
    

    // Add fields to updateData only if they exist in req.body
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    // Handle address updates safely if provided
    if (address) {
      updateData.address = {
        street: address?.street,
        city: address?.city ,
        state: address?.state ,
        postalCode: address?.postalCode ,
        country: address?.country ,
      };
      if (address.street) updateData.address.street = address.street;
      if (address.city) updateData.address.city = address.city;
      if (address.state) updateData.address.state = address.state;
      if (address.postalCode) updateData.address.postalCode = address.postalCode;
      if (address.country) updateData.address.country = address.country;
    }
   

    // Handle profile updates safely if provided
    if (profile) {
      updateData.profile = {
        bio: profile?.bio ,
        profilePicture: profile?.profilePicture,
      };
      if (profile.bio) updateData.profile.bio = profile.bio;
    }

     // Handle profile picture upload if provided
     if (req.files && req.files.profilePicture) {
      const profilePictureFile = req.files.profilePicture;
      const uploadResult = await uploadFileToS3(profilePictureFile);
      updateData.profile.profilePicture = uploadResult.url;
    }

    // Update client
    const client = await Client.findByIdAndUpdate(
      clientId,
      { $set: updateData },
      { 
        new: true,
        runValidators: true,
        select: '-password -refreshToken -ip'
      }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      data: client
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Invalid input data', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update profile' });
  }
};









// Change Password
// Password change function for Agent
const changeAgentPassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await Agent.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: 'Agent password changed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'An error occurred: ' + error.message });
  }
};

// Password change function for Client
const changeClientPassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await Client.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: 'Client password changed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'An error occurred: ' + error.message });
  }
};

// Main changePassword function that handles different roles
export const changePassword = async (req, res, next) => {
  try {
    const { role } = req.body;

    // Check for role and call the respective function
    switch (role) {
      case 'SERVICE_PROVIDER':
        // Service provider password changes should be handled by shopkeeper service
        return res.status(400).json({ 
          message: 'Service provider password changes should be handled through the shopkeeper service' 
        });
      case 'AGENT':
        return await changeAgentPassword(req, res, next);
      case 'CLIENT':
        return await changeClientPassword(req, res, next);
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred: ' + error.message });
  }
};
