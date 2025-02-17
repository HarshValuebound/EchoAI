import React, { useEffect, useState } from "react";
import LoaderWithLogo from "@/components/loaders/loader-with-logo/loaderWithLogo";
import DetailsPopup from "@/components/dashboard/interview/create-popup/details";
import QuestionsPopup from "@/components/dashboard/interview/create-popup/questions";
import { InterviewBase } from "@/types/interview";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CreateEmptyInterviewData = (): InterviewBase => ({
  user_id: "",
  organization_id: "",
  name: "",
  interviewer_id: BigInt(0),
  objective: "",
  question_count: 0,
  time_duration: "",
  is_anonymous: false,
  questions: [],
  description: "",
  response_count: BigInt(0),
  csv_file: "",
});

function CreateInterviewModal({ open, setOpen }: Props) {
  const [loading, setLoading] = useState(false);
  const [proceed, setProceed] = useState(false);
  const [interviewData, setInterviewData] = useState<InterviewBase>(
    CreateEmptyInterviewData(),
  );

  // Below for File Upload
  const [isJdUploaded, setIsJdUploaded] = useState(false);
const [isCsvUploaded, setIsCsvUploaded] = useState(false);
const [jdFileName, setJdFileName] = useState("");
const [csvFileName, setCsvFileName] = useState("");

  

  useEffect(() => {
    if (loading == true) {
      setLoading(false);
      setProceed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewData]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setProceed(false);
      setInterviewData(CreateEmptyInterviewData());
      // Below for File Upload
      setIsJdUploaded(false);
      setJdFileName("");
      setIsCsvUploaded(false);
      setCsvFileName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      {loading ? (
        <div className="w-[38rem] h-[35.3rem]">
          <LoaderWithLogo />
        </div>
      ) : !proceed ? (
        <DetailsPopup
          open={open}
          setLoading={setLoading}
          interviewData={interviewData}
          setInterviewData={setInterviewData}
          isJdUploaded={isJdUploaded}
          setIsJdUploaded={setIsJdUploaded}
          isCsvUploaded={isCsvUploaded}
          setIsCsvUploaded={setIsCsvUploaded}
          jdFileName={jdFileName}
          setJdFileName={setJdFileName}
          csvFileName={csvFileName}
          setCsvFileName={setCsvFileName}
        />
      ) : (
        <QuestionsPopup
          interviewData={interviewData}
          setProceed={setProceed}
          setOpen={setOpen}
        />
      )}
      
    </>
  );
}

export default CreateInterviewModal;
