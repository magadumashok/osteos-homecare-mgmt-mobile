import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import { thunkRestoreSession } from "../store/thunks/authThunks";
import { colors } from "../theme";

import LoginScreen from "../screens/auth/LoginScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";

import DashboardScreen from "../screens/home/DashboardScreen";
import ProfileScreen from "../screens/home/ProfileScreen";
import ChangePasswordScreen from "../screens/home/ChangePasswordScreen";
import StaffDirectoryScreen from "../screens/home/StaffDirectoryScreen";

import PatientListScreen from "../screens/patients/PatientListScreen";
import PatientHubScreen from "../screens/patients/PatientHubScreen";
import NotesScreen from "../screens/patients/NotesScreen";
import VitalsScreen from "../screens/patients/VitalsScreen";
import DocumentsScreen from "../screens/patients/DocumentsScreen";
import MedicationsScreen from "../screens/patients/MedicationsScreen";
import PrescriptionsScreen from "../screens/patients/PrescriptionsScreen";
import ServicePackageScreen from "../screens/patients/ServicePackageScreen";
import ConsentScreen from "../screens/patients/ConsentScreen";
import PatientSchedulesScreen from "../screens/patients/PatientSchedulesScreen";
import DischargePatientScreen from "../screens/patients/DischargePatientScreen";
import MySignatureScreen from "../screens/home/MySignatureScreen";
import PatientFormScreen from "../screens/patients/PatientFormScreen";
import DischargeListScreen from "../screens/patients/DischargeListScreen";

import LeadsScreen from "../screens/leads/LeadsScreen";
import LeadFormScreen from "../screens/leads/LeadFormScreen";
import AssessmentsScreen from "../screens/assessments/AssessmentsScreen";
import AssessmentFormScreen from "../screens/assessments/AssessmentFormScreen";

import WalkInScreen from "../screens/duties/WalkInScreen";
import MyTripsScreen from "../screens/driver/MyTripsScreen";

import DutySchedulesScreen from "../screens/admin/DutySchedulesScreen";
import DutyFormScreen from "../screens/admin/DutyFormScreen";
import ShortVisitScreen from "../screens/admin/ShortVisitScreen";
import StaffListScreen from "../screens/admin/StaffListScreen";
import AttendanceScreen from "../screens/admin/AttendanceScreen";

import MyDutiesScreen from "../screens/duties/MyDutiesScreen";
import DutyDetailScreen from "../screens/duties/DutyDetailScreen";

const Stack = createNativeStackNavigator();
const screenOptions = { headerShown: false };

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="StaffDirectory" component={StaffDirectoryScreen} />

      <Stack.Screen name="Patients" component={PatientListScreen} />
      <Stack.Screen name="PatientHub" component={PatientHubScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="Vitals" component={VitalsScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Medications" component={MedicationsScreen} />
      <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} />
      <Stack.Screen name="ServicePackage" component={ServicePackageScreen} />
      <Stack.Screen name="Consent" component={ConsentScreen} />
      <Stack.Screen name="PatientSchedules" component={PatientSchedulesScreen} />
      <Stack.Screen name="DischargePatient" component={DischargePatientScreen} />
      <Stack.Screen name="MySignature" component={MySignatureScreen} />
      <Stack.Screen name="PatientForm" component={PatientFormScreen} />
      <Stack.Screen name="DischargeList" component={DischargeListScreen} />

      <Stack.Screen name="Leads" component={LeadsScreen} />
      <Stack.Screen name="LeadForm" component={LeadFormScreen} />
      <Stack.Screen name="Assessments" component={AssessmentsScreen} />
      <Stack.Screen name="AssessmentForm" component={AssessmentFormScreen} />

      <Stack.Screen name="WalkIn" component={WalkInScreen} />
      <Stack.Screen name="MyTrips" component={MyTripsScreen} />

      <Stack.Screen name="DutySchedules" component={DutySchedulesScreen} />
      <Stack.Screen name="DutyForm" component={DutyFormScreen} />
      <Stack.Screen name="ShortVisit" component={ShortVisitScreen} />
      <Stack.Screen name="StaffList" component={StaffListScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />

      <Stack.Screen name="MyDuties" component={MyDutiesScreen} />
      <Stack.Screen name="DutyDetail" component={DutyDetailScreen} />
    </Stack.Navigator>
  );
}

/** Signed-in state picks the stack, so screens never navigate after login/logout. */
export default function AppNavigator() {
  const dispatch = useDispatch();
  const { bootstrapped, user } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(thunkRestoreSession());
  }, [dispatch]);

  if (!bootstrapped) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color={colors.onPrimary} />
      </View>
    );
  }

  return user ? <MainStack /> : <AuthStack />;
}
