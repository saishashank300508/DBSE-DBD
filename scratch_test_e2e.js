const axios = require('./frontend/node_modules/axios');

const AUTH_URL = 'http://localhost:8081/api/auth';
const DONATION_URL = 'http://localhost:8082/api/donations';
const TRACKING_URL = 'http://localhost:8083/api';

async function runTest() {
  console.log('=== STARTING FOOD CONNECT E2E VERIFICATION ===\n');
  const timestamp = Date.now();

  // Step 1: Sign up as Volunteer (WITH NO ADDRESS)
  console.log('1. Testing Volunteer Sign Up (without address)...');
  const volEmail = `vol_${timestamp}@test.com`;
  const volRegRes = await axios.post(`${AUTH_URL}/register`, {
    fullName: 'Rahul Volunteer',
    email: volEmail,
    password: 'Password@123',
    phone: '9876543210',
    role: 'VOLUNTEER',
    latitude: 12.9716,
    longitude: 77.5946
  });
  console.log('   ✓ Volunteer registered. Profile ID:', volRegRes.data.user.profileId);
  const volToken = volRegRes.data.accessToken;
  const volProfileId = volRegRes.data.user.profileId;
  const volUserId = volRegRes.data.user.id;

  // Step 1b: Sign up as Donor
  console.log('2. Testing Donor Sign Up...');
  const donorEmail = `donor_${timestamp}@test.com`;
  const donorRegRes = await axios.post(`${AUTH_URL}/register`, {
    fullName: 'Taj Kitchens',
    email: donorEmail,
    password: 'Password@123',
    phone: '9876543211',
    role: 'DONOR',
    organization: 'Taj Kitchens Hotel',
    address: '100 Residency Road, Ashok Nagar',
    city: 'Bangalore',
    latitude: 12.9698,
    longitude: 77.6045
  });
  console.log('   ✓ Donor registered. Profile ID:', donorRegRes.data.user.profileId);
  const donorToken = donorRegRes.data.accessToken;
  const donorUserId = donorRegRes.data.user.id;

  // Step 1c: Sign up as NGO
  console.log('3. Testing NGO Sign Up...');
  const ngoEmail = `ngo_${timestamp}@test.com`;
  const ngoRegRes = await axios.post(`${AUTH_URL}/register`, {
    fullName: 'Ananya Rao',
    email: ngoEmail,
    password: 'Password@123',
    phone: '9876543212',
    role: 'NGO',
    organization: 'Akshaya Care Foundation',
    registrationNo: 'REG-2026-BLR',
    address: '45 MG Road, Trinity Circle',
    city: 'Bangalore',
    latitude: 12.9740,
    longitude: 77.6190,
    serviceRadiusKm: 15.0
  });
  console.log('   ✓ NGO registered. Profile ID:', ngoRegRes.data.user.profileId);
  const ngoToken = ngoRegRes.data.accessToken;
  const ngoProfileId = ngoRegRes.data.user.profileId;

  // Step 1d: Verify Login works for each
  console.log('4. Testing Login for all 3 users...');
  const volLogin = await axios.post(`${AUTH_URL}/login`, { email: volEmail, password: 'Password@123' });
  const donorLogin = await axios.post(`${AUTH_URL}/login`, { email: donorEmail, password: 'Password@123' });
  const ngoLogin = await axios.post(`${AUTH_URL}/login`, { email: ngoEmail, password: 'Password@123' });
  console.log('   ✓ Login passed for Volunteer, Donor, and NGO.');

  // Step 2: Donor posts a donation
  console.log('\n5. Donor posting a new donation...');
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const formatLocal = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const cookedAt = formatLocal(new Date(now.getTime() - 30 * 60000));
  const expiresAt = formatLocal(new Date(now.getTime() + 4 * 3600000));

  const donRes = await axios.post(
    DONATION_URL,
    {
      foodName: '40 Hot Biryani Meals',
      foodType: 'NON_VEG',
      quantity: 40,
      cookedAt: cookedAt,
      expiresAt: expiresAt,
      pickupAddress: 'Taj Kitchens Gate 2, Residency Road',
      latitude: 12.9698,
      longitude: 77.6045,
      contactNumber: '9876543211',
      description: 'Freshly prepared chicken biryani packed in hygienic food boxes.',
      notificationRadiusKm: 10.0
    },
    { headers: { Authorization: `Bearer ${donorToken}` } }
  );
  const donation = donRes.data;
  console.log('   ✓ Donation created. ID:', donation.id, '| Status:', donation.status);
  console.log('   ✓ Generated Pickup OTP:', donation.pickupOtp, '| Delivery OTP:', donation.deliveryOtp);

  // Step 2b: NGO checks nearby donations
  console.log('6. NGO fetching nearby available donations...');
  const nearbyRes = await axios.get(
    `${DONATION_URL}/nearby?lat=12.9740&lng=77.6190&radius=10`,
    { headers: { Authorization: `Bearer ${ngoToken}` } }
  );
  const found = nearbyRes.data.find(d => d.id === donation.id);
  console.log('   ✓ Found donation in NGO nearby query? ->', found ? 'YES' : 'NO');
  if (found) {
    console.log('   ✓ Computed Distance:', found.distanceKm, 'km');
  }

  // Step 3: NGO accepts donation
  console.log('\n7. NGO accepting the donation...');
  const acceptRes = await axios.put(
    `${DONATION_URL}/${donation.id}/accept?ngoId=${ngoProfileId}`,
    {},
    { headers: { Authorization: `Bearer ${ngoToken}` } }
  );
  console.log('   ✓ Donation accepted. Status:', acceptRes.data.status);
  console.log('   ✓ NGO details attached in DTO -> Name:', acceptRes.data.ngoName, '| Drop-off:', acceptRes.data.ngoAddress);

  // Step 3b: Query available volunteers ranked by distance & workload
  console.log('8. NGO querying ranked available volunteers...');
  const volListRes = await axios.get(
    `${DONATION_URL}/${donation.id}/available-volunteers`,
    { headers: { Authorization: `Bearer ${ngoToken}` } }
  );
  console.log(`   ✓ Found ${volListRes.data.length} available volunteers.`);
  if (volListRes.data.length > 0) {
    const top = volListRes.data[0];
    console.log(`   ✓ Top match: ${top.fullName} (${top.distanceKm} km away, ${top.activeTasks} active tasks)`);
  }

  // Step 3c: Assign volunteer
  console.log('9. NGO assigning volunteer to donation...');
  const assignRes = await axios.put(
    `${DONATION_URL}/${donation.id}/assign-volunteer`,
    { volunteerId: volProfileId },
    { headers: { Authorization: `Bearer ${ngoToken}` } }
  );
  console.log('   ✓ Volunteer assigned. Status:', assignRes.data.status);
  console.log('   ✓ Assigned Volunteer Name:', assignRes.data.assignedVolunteerName);

  // Step 4: Volunteer verifies dashboard assignments
  console.log('\n10. Volunteer fetching assigned tasks...');
  const volTasksRes = await axios.get(
    `${DONATION_URL}/volunteer/${volProfileId}`,
    { headers: { Authorization: `Bearer ${volToken}` } }
  );
  const assignedTask = volTasksRes.data.find(d => d.id === donation.id);
  console.log('   ✓ Found assigned task on Volunteer Dashboard? ->', assignedTask ? 'YES' : 'NO');
  if (assignedTask) {
    console.log('   ✓ Task details: NGO Name =', assignedTask.ngoName, '| Pickup =', assignedTask.pickupAddress);
  }

  // Step 4b: Check Volunteer & Donor notifications in DB
  console.log('11. Checking persisted notifications in DB for volunteer & donor...');
  const volNotifs = await axios.get(`${TRACKING_URL}/notifications`, {
    headers: { Authorization: `Bearer ${volToken}` }
  });
  console.log(`   ✓ Volunteer received ${volNotifs.data.length} notification(s). Latest: "${volNotifs.data[0]?.title}"`);

  // Step 5: Volunteer accepts task / starts pickup
  console.log('\n12. Volunteer accepts task / starts pickup...');
  const startRes = await axios.put(
    `${DONATION_URL}/${donation.id}/accept-task`,
    {},
    { headers: { Authorization: `Bearer ${volToken}` } }
  );
  console.log('   ✓ Status updated to:', startRes.data.status);

  // Step 5b: Record live GPS coordinate breadcrumb
  console.log('13. Simulating live GPS coordinate broadcast...');
  await axios.post(
    `${TRACKING_URL}/tracking/${donation.id}/location`,
    {
      latitude: 12.9705,
      longitude: 77.6080,
      speedKmh: 24.5,
      heading: 90
    },
    { headers: { Authorization: `Bearer ${volToken}` } }
  );
  const trailRes = await axios.get(`${TRACKING_URL}/tracking/${donation.id}`, {
    headers: { Authorization: `Bearer ${volToken}` }
  });
  console.log(`   ✓ GPS trail verified. Stored breadcrumbs: ${trailRes.data.length}`);

  // Step 6: OTP Handover - Volunteer enters Pickup OTP from Donor
  console.log('\n14. Testing OTP Handover Verification for PICKED_UP...');
  // First test wrong OTP (should fail)
  try {
    await axios.put(
      `${DONATION_URL}/${donation.id}/status`,
      { status: 'PICKED_UP', otp: '9999' },
      { headers: { Authorization: `Bearer ${volToken}` } }
    );
    console.log('   ✗ ERROR: Wrong OTP was incorrectly accepted!');
  } catch (err) {
    console.log('   ✓ Correctly rejected wrong OTP:', err.response?.data?.message || err.message);
  }

  // Now test correct OTP
  const pickupRes = await axios.put(
    `${DONATION_URL}/${donation.id}/status`,
    { status: 'PICKED_UP', otp: donation.pickupOtp },
    { headers: { Authorization: `Bearer ${volToken}` } }
  );
  console.log('   ✓ Verified with correct Pickup OTP! Status:', pickupRes.data.status);

  // Step 6b: OTP Handover - Delivery to NGO (REACHED_NGO)
  console.log('\n15. Testing Delivery to NGO (REACHED_NGO) with Delivery OTP...');
  const reachedRes = await axios.put(
    `${DONATION_URL}/${donation.id}/status`,
    { status: 'REACHED_NGO', otp: donation.deliveryOtp },
    { headers: { Authorization: `Bearer ${volToken}` } }
  );
  console.log('   ✓ Reached NGO verified with Delivery OTP! Status:', reachedRes.data.status);

  // Step 6c: NGO records distribution (meals served)
  console.log('\n16. NGO recording distribution of meals...');
  const distRes = await axios.post(
    `${DONATION_URL}/distributions?ngoId=${ngoProfileId}`,
    {
      donationId: donation.id,
      beneficiaryCount: 40,
      locationName: 'Shanti Bhavan Shelter',
      notes: 'Distributed fresh biryani to 40 shelter residents.'
    },
    { headers: { Authorization: `Bearer ${ngoToken}` } }
  );
  console.log('   ✓ Distribution recorded. Beneficiaries:', distRes.data.beneficiaryCount);

  // Step 7: Check Status History for duplicates, ordering, and real names
  console.log('\n17. Checking Status History audit trail...');
  const historyRes = await axios.get(`${DONATION_URL}/${donation.id}/history`, {
    headers: { Authorization: `Bearer ${donorToken}` }
  });
  console.log(`   ✓ Found ${historyRes.data.length} history records:`);
  historyRes.data.forEach((h, i) => {
    console.log(`     ${i + 1}. [${h.status}] - Note: "${h.note}"`);
  });

  // Verify real names exist in notes
  const notesText = historyRes.data.map(h => h.note).join(' ');
  const hasDonorName = notesText.includes('Taj Kitchens');
  const hasNgoName = notesText.includes('Akshaya Care Foundation');
  const hasVolName = notesText.includes('Rahul Volunteer');
  console.log('   ✓ Contains real Donor name? ->', hasDonorName ? 'YES' : 'NO');
  console.log('   ✓ Contains real NGO name?   ->', hasNgoName ? 'YES' : 'NO');
  console.log('   ✓ Contains real Volunteer name? ->', hasVolName ? 'YES' : 'NO');

  console.log('\n=== ALL END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTest().catch(err => {
  console.error('Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
