import { useQuery, useQueries } from "@tanstack/react-query";

interface UsePatientDataProps {
  workspaceid: string;
  patientid: string;
}

export function usePatientData({ workspaceid, patientid }: UsePatientDataProps) {
  // Prefetch all patient data in parallel using React Query
  const queries = useQueries({
    queries: [
      {
        queryKey: ["appointments", workspaceid, patientid],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/appointments`);
          if (!res.ok) throw new Error("Failed to fetch appointments");
          const data = await res.json();
          return data.appointments || [];
        },
      },
      {
        queryKey: ["vital-signs", workspaceid, patientid, 1, 0],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/vital-signs?limit=1&offset=0`);
          if (!res.ok) throw new Error("Failed to fetch vital signs");
          const data = await res.json();
          return { vitalSigns: data.vitalSigns || [], hasMore: data.hasMore || false };
        },
      },
      {
        queryKey: ["diagnoses", workspaceid, patientid, 2, 0],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/diagnoses?limit=2&offset=0`);
          if (!res.ok) throw new Error("Failed to fetch diagnoses");
          const data = await res.json();
          return { diagnoses: data.diagnoses || [], hasMore: data.hasMore || false };
        },
      },
      {
        queryKey: ["imaging", workspaceid, patientid],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/imaging`);
          if (!res.ok) throw new Error("Failed to fetch imaging");
          const data = await res.json();
          return { requests: data.requests || [], results: data.results || [] };
        },
      },
      {
        queryKey: ["care-plans", workspaceid, patientid],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/care-plans`);
          if (!res.ok) throw new Error("Failed to fetch care plans");
          const data = await res.json();
          return data.carePlans || [];
        },
      },
      {
        queryKey: ["test-orders", workspaceid, patientid, 4, 0],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/test-orders?limit=4&offset=0`);
          if (!res.ok) throw new Error("Failed to fetch test orders");
          const data = await res.json();
          return { testOrders: data.testOrders || [], hasMore: data.hasMore || false };
        },
      },
      {
        queryKey: ["lab-results", workspaceid, patientid],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/lab-results`);
          if (!res.ok) throw new Error("Failed to fetch lab results");
          const data = await res.json();
          return data.labResults || [];
        },
      },
      {
        queryKey: ["prescriptions", workspaceid, patientid],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/prescriptions`);
          if (!res.ok) throw new Error("Failed to fetch prescriptions");
          const data = await res.json();
          return data.prescriptions || [];
        },
      },
      {
        queryKey: ["referrals", workspaceid, patientid],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/referrals`);
          if (!res.ok) throw new Error("Failed to fetch referrals");
          const data = await res.json();
          return data.referrals || [];
        },
      },
      {
        queryKey: ["vaccinations", workspaceid, patientid],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/vaccinations`);
          if (!res.ok) throw new Error("Failed to fetch vaccinations");
          const data = await res.json();
          return data.vaccinations || [];
        },
      },
      {
        queryKey: ["notes", workspaceid, patientid],
        queryFn: async () => {
          const res = await fetch(`/api/d/${workspaceid}/patients/${patientid}/notes`);
          if (!res.ok) throw new Error("Failed to fetch notes");
          const data = await res.json();
          return data.notes || [];
        },
      },
    ],
  });

  return {
    appointments: queries[0].data || [],
    loadingAppointments: queries[0].isLoading,
    
    vitalSigns: queries[1].data?.vitalSigns || [],
    vitalsHasMore: queries[1].data?.hasMore || false,
    loadingVitalSigns: queries[1].isLoading,
    
    diagnoses: queries[2].data?.diagnoses || [],
    diagnosesHasMore: queries[2].data?.hasMore || false,
    loadingDiagnoses: queries[2].isLoading,
    
    imagingRequests: queries[3].data?.requests || [],
    imagingResults: queries[3].data?.results || [],
    loadingImaging: queries[3].isLoading,
    
    carePlans: queries[4].data || [],
    loadingCarePlans: queries[4].isLoading,
    
    testOrders: queries[5].data?.testOrders || [],
    testOrdersHasMore: queries[5].data?.hasMore || false,
    loadingTestOrders: queries[5].isLoading,
    
    labResults: queries[6].data || [],
    loadingLabResults: queries[6].isLoading,
    
    prescriptions: queries[7].data || [],
    loadingPrescriptions: queries[7].isLoading,
    
    referrals: queries[8].data || [],
    loadingReferrals: queries[8].isLoading,
    
    vaccinations: queries[9].data || [],
    loadingVaccinations: queries[9].isLoading,
    
    notes: queries[10].data || [],
    loadingNotes: queries[10].isLoading,
    
    // Overall loading state
    isLoading: queries.some(q => q.isLoading),
  };
}
