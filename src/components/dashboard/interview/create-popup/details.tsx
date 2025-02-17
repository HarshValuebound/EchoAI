import React, { useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useInterviewers } from "@/contexts/interviewers.context";
import { InterviewBase, Question } from "@/types/interview";
import { ChevronRight, ChevronLeft, Info } from "lucide-react";
import Image from "next/image";
import { CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import FileUpload from "../fileUpload";
import Modal from "@/components/dashboard/Modal";
import InterviewerDetailsModal from "@/components/dashboard/interviewer/interviewerDetailsModal";
import { Interviewer } from "@/types/interviewer";
import CSVUpload from "../csvUpload";
import Papa from "papaparse";
import { ParseResult } from 'papaparse';

interface Props {
  open: boolean;
  setLoading: (loading: boolean) => void;
  interviewData: InterviewBase;
  setInterviewData: (interviewData: InterviewBase) => void;
  // Split into separate states for JD and CSV
  isJdUploaded: boolean;
  setIsJdUploaded: (isUploaded: boolean) => void;
  isCsvUploaded: boolean;
  setIsCsvUploaded: (isUploaded: boolean) => void;
  jdFileName: string;
  setJdFileName: (fileName: string) => void;
  csvFileName: string;
  setCsvFileName: (fileName: string) => void;
}

function DetailsPopup({
  open,
  setLoading,
  interviewData,
  setInterviewData,
  isJdUploaded,
  setIsJdUploaded,
  isCsvUploaded,
  setIsCsvUploaded,
  jdFileName,
  setJdFileName,
  csvFileName,
  setCsvFileName,
}: Props) {
  const { interviewers } = useInterviewers();
  const [isClicked, setIsClicked] = useState(false);
  const [openInterviewerDetails, setOpenInterviewerDetails] = useState(false);
  const [interviewerDetails, setInterviewerDetails] = useState<Interviewer>();

  const [name, setName] = useState(interviewData.name);
  const [selectedInterviewer, setSelectedInterviewer] = useState(
    interviewData.interviewer_id,
  );
  const [objective, setObjective] = useState(interviewData.objective);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(
    interviewData.is_anonymous,
  );
  const [numQuestions, setNumQuestions] = useState(
    interviewData.question_count == 0
      ? ""
      : String(interviewData.question_count),
  );
  const [duration, setDuration] = useState(interviewData.time_duration);
  const [uploadedDocumentContext, setUploadedDocumentContext] = useState("");
  const [csvData, setCsvData] = useState<Array<{ 
    name: string; 
    email: string; 
    resumeLink: string;
    resumeText: string 
  }>>([]);

  const slideLeft = (id: string, value: number) => {
    var slider = document.getElementById(`${id}`);
    if (slider) {
      slider.scrollLeft = slider.scrollLeft - value;
    }
  };

  const slideRight = (id: string, value: number) => {
    var slider = document.getElementById(`${id}`);
    if (slider) {
      slider.scrollLeft = slider.scrollLeft + value;
    }
  };


  const extractFileIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/d\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const parseCSV = (file: File): Promise<Array<{ 
    name: string; 
    email: string; 
    resumeLink: string 
  }>> => {
    return new Promise((resolve, reject) => {
      Papa.parse<any>(file, {
        header: true,
        complete: (results: ParseResult<any>) => {
          console.log("CSV Parsing Complete:", results.data);
          const users = results.data
            .filter((row) => row['user name'] && row['user email'] && row['resume links'])
            .map((row) => ({
              name: row['user name'].trim(),
              email: row['user email'].trim(),
              resumeLink: row['resume links'].trim(),
            }));
          console.log("Filtered Users:", users);
          resolve(users);
        },
        error: (error: Error, file: File) => {
          console.error("Error parsing CSV:", error);
          reject(error);
        },
      });
    });
  };

  const processUsers = async (users: Array<{ 
    name: string; 
    email: string; 
    resumeLink: string 
  }>) => {
    console.log("Processing Users:", users);
    const usersWithResumeText = [];
    for (const user of users) {
      try {
        const fileId = extractFileIdFromUrl(user.resumeLink);
        if (!fileId) throw new Error('Invalid Google Drive URL');
        
        const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
        const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

        console.log(`Downloading resume for ${user.name} from:`, downloadUrl);
        const pdfResponse = await axios.post('/api/parse-pdf', response.data, {
          headers: {
            'Content-Type': 'application/pdf',
          },
        });

        if (pdfResponse.data.success) {
          usersWithResumeText.push({
            ...user,
            resumeText: pdfResponse.data.text,
          });
          console.log(`Successfully processed resume for ${user.name}`);
        } else {
          throw new Error(pdfResponse.data.error);
        }
      } catch (error) {
        console.error(`Error processing ${user.name}'s resume:`, error);
        usersWithResumeText.push({
          ...user,
          resumeText: "",
        });
      }
    }
    return usersWithResumeText;
  };

  const handleCSVFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected CSV File:", file.name);
      setLoading(true);
      try {
        const users = await parseCSV(file);
        console.log("Parsed Users from CSV:", users);
        const processedUsers = await processUsers(users);
        setCsvData(processedUsers);
        setIsCsvUploaded(true);
        setCsvFileName(file.name);
      } catch (error) {
        console.error("Error processing CSV:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const onGenrateQuestions = async () => {
    setLoading(true);

    const data = {
      name: name.trim(),
      objective: objective.trim(),
      number: numQuestions,
      context: uploadedDocumentContext,
      users: csvData,
    };

    const generatedQuestions = (await axios.post(
      "/api/generate-interview-questions",
      data,
    )) as any;

    const generatedQuestionsResponse = JSON.parse(
      generatedQuestions?.data?.response,
    );

    const updatedQuestions = generatedQuestionsResponse.questions.map(
      (question: Question) => ({
        id: uuidv4(),
        question: question.question.trim(),
        follow_up_count: 1,
      }),
    );

    const updatedInterviewData = {
      ...interviewData,
      name: name.trim(),
      objective: objective.trim(),
      questions: updatedQuestions,
      interviewer_id: selectedInterviewer,
      question_count: Number(numQuestions),
      time_duration: duration,
      description: generatedQuestionsResponse.description,
      is_anonymous: isAnonymous,
    };
    setInterviewData(updatedInterviewData);
  };

  const onManual = () => {
    setLoading(true);

    const updatedInterviewData = {
      ...interviewData,
      name: name.trim(),
      objective: objective.trim(),
      questions: [{ id: uuidv4(), question: "", follow_up_count: 1 }],
      interviewer_id: selectedInterviewer,
      question_count: Number(numQuestions),
      time_duration: String(duration),
      description: "",
      is_anonymous: isAnonymous,
    };
    setInterviewData(updatedInterviewData);
  };
  
  useEffect(() => {
    if (!open) {
      setName("");
      setSelectedInterviewer(BigInt(0));
      setObjective("");
      setIsAnonymous(false);
      setNumQuestions("");
      setDuration("");
      setIsClicked(false);
    }
  }, [open]);

  return (
    <>
      <div className="text-center w-[38rem]">
        <h1 className="text-xl font-semibold">Create an Interview</h1>
        <div className="flex flex-col justify-center items-start mt-4 ml-10 mr-8">
          <div className="flex flex-row justify-center items-center">
            <h3 className="text-sm font-medium">Interview Name:</h3>
            <input
              type="text"
              className="border-b-2 focus:outline-none border-gray-500 px-2 w-96 py-0.5 ml-3"
              placeholder="e.g. Name of the Interview"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={(e) => setName(e.target.value.trim())}
            />
          </div>
          <h3 className="text-sm mt-3 font-medium">Select an Interviewer:</h3>
          <div className="relative flex items-center mt-1">
            <div
              id="slider-3"
              className=" h-36 pt-1 overflow-x-scroll scroll whitespace-nowrap scroll-smooth scrollbar-hide w-[27.5rem]"
            >
              {interviewers.map((item, key) => (
                <div
                  className=" p-0 inline-block cursor-pointer ml-1 mr-5 rounded-xl shrink-0 overflow-hidden"
                  key={item.id}
                >
                  <button
                    className="absolute ml-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInterviewerDetails(item);
                      setOpenInterviewerDetails(true);
                    }}
                  >
                    <Info size={18} color="#4f46e5" strokeWidth={2.2} />
                  </button>
                  <div
                    className={`w-[96px] overflow-hidden rounded-full ${
                      selectedInterviewer === item.id
                        ? "border-4 border-indigo-600"
                        : ""
                    }`}
                    onClick={() => setSelectedInterviewer(item.id)}
                  >
                    <Image
                      src={item.image}
                      alt="Picture of the interviewer"
                      width={70}
                      height={70}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardTitle className="mt-0 text-xs text-center">
                    {item.name}
                  </CardTitle>
                </div>
              ))}
            </div>
            {interviewers.length > 4 ? (
              <div className="flex-row justify-center ml-3 mb-1 items-center space-y-6">
                <ChevronRight
                  className="opacity-50 cursor-pointer hover:opacity-100"
                  size={27}
                  onClick={() => slideRight("slider-3", 115)}
                />
                <ChevronLeft
                  className="opacity-50 cursor-pointer hover:opacity-100"
                  size={27}
                  onClick={() => slideLeft("slider-3", 115)}
                />
              </div>
            ) : (
              <></>
            )}
          </div>
          <h3 className="text-sm font-medium">Objective:</h3>
          <Textarea
            value={objective}
            className="h-24 mt-2 border-2 border-gray-500 w-[33.2rem]"
            placeholder="e.g. Find best candidates based on their technical skills and previous projects."
            onChange={(e) => setObjective(e.target.value)}
            onBlur={(e) => setObjective(e.target.value.trim())}
          />
          <h3 className="text-sm font-medium mt-2">
          Upload any documents related to the interview.
        </h3>
        <FileUpload
          isUploaded={isJdUploaded}
          setIsUploaded={setIsJdUploaded}
          fileName={jdFileName}
          setFileName={setJdFileName}
          setUploadedDocumentContext={setUploadedDocumentContext}
        />
        {isJdUploaded && (
          <p className="mt-2 text-sm text-gray-600">
            Uploaded Job Description: {jdFileName}
          </p>
        )}

        <h3 className="text-sm font-medium mt-2">
          Upload A CSV file with the list of interviewees and their resumes
        </h3>
        <CSVUpload
          isUploaded={isCsvUploaded}
          setIsUploaded={setIsCsvUploaded}
          fileName={csvFileName}
          setFileName={setCsvFileName}
          onChange={handleCSVFile}
        />
        {isCsvUploaded && (
          <p className="mt-2 text-sm text-gray-600">
            Uploaded CSV: {csvFileName}
          </p>
        )}
          <label className="flex-col mt-7 w-full">
            <div className="flex items-center cursor-pointer">
              <span className="text-sm font-medium">
                Do you prefer the interviewees&apos; responses to be anonymous?
              </span>
              <Switch
                checked={isAnonymous}
                className={`ml-4 mt-1 ${
                  isAnonymous ? "bg-indigo-600" : "bg-[#E6E7EB]"
                }`}
                onCheckedChange={(checked) => setIsAnonymous(checked)}
              />
            </div>
            <span
              style={{ fontSize: "0.7rem", lineHeight: "0.66rem" }}
              className="font-light text-xs italic w-full text-left block"
            >
              Note: If not anonymous, the interviewee&apos;s email and name will
              be collected.
            </span>
          </label>
          
          <div className="flex flex-row gap-3 justify-between w-full mt-3">
            <div className="flex flex-row justify-center items-center ">
              <h3 className="text-sm font-medium ">Number of Questions:</h3>
              <input
                type="number"
                step="1"
                max="5"
                min="1"
                className="border-b-2 text-center focus:outline-none  border-gray-500 w-14 px-2 py-0.5 ml-3"
                value={numQuestions}
                onChange={(e) => {
                  let value = e.target.value;
                  if (
                    value === "" ||
                    (Number.isInteger(Number(value)) && Number(value) > 0)
                  ) {
                    if (Number(value) > 5) {
                      value = "5";
                    }
                    setNumQuestions(value);
                  }
                }}
              />
            </div>
            <div className="flex flex-row justify-center items-center">
              <h3 className="text-sm font-medium ">Duration (mins):</h3>
              <input
                type="number"
                step="1"
                max="10"
                min="1"
                className="border-b-2 text-center focus:outline-none  border-gray-500 w-14 px-2 py-0.5 ml-3"
                value={duration}
                onChange={(e) => {
                  let value = e.target.value;
                  if (
                    value === "" ||
                    (Number.isInteger(Number(value)) && Number(value) > 0)
                  ) {
                    if (Number(value) > 10) {
                      value = "10";
                    }
                    setDuration(value);
                  }
                }}
              />
            </div>
          </div>
          <div className="flex flex-row w-full justify-center items-center space-x-24 mt-5">
            <Button
              disabled={
                (name &&
                objective &&
                numQuestions &&
                duration &&
                selectedInterviewer != BigInt(0)
                  ? false
                  : true) || isClicked
              }
              className="bg-indigo-600 hover:bg-indigo-800  w-40"
              onClick={() => {
                setIsClicked(true);
                onGenrateQuestions();
              }}
            >
              Generate Questions
            </Button>
            <Button
              disabled={
                (name &&
                objective &&
                numQuestions &&
                duration &&
                selectedInterviewer != BigInt(0)
                  ? false
                  : true) || isClicked
              }
              className="bg-indigo-600 w-40 hover:bg-indigo-800"
              onClick={() => {
                setIsClicked(true);
                onManual();
              }}
            >
              I&apos;ll do it myself
            </Button>
          </div>
        </div>
      </div>
      <Modal
        open={openInterviewerDetails}
        closeOnOutsideClick={true}
        onClose={() => {
          setOpenInterviewerDetails(false);
        }}
      >
        <InterviewerDetailsModal interviewer={interviewerDetails} />
      </Modal>
    </>
  );
}

export default DetailsPopup;
