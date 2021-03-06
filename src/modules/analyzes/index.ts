import { combineReducers } from "redux";
import { put, takeEvery, call, select, fork } from "redux-saga/effects";
import { IAppStore } from "reducers";
import {
  makeApiGetRequest, processError,
} from "modules/api";

enum AnalyzesAction {
  FetchPull = "@@GOLANGCI/ANALYZES/PULL/FETCH",
  FetchedPull = "@@GOLANGCI/ANALYZES/PULL/FETCHED",
}

export const fetchAnalysis = (owner: string, name: string, prNumber: number) => ({
  type: AnalyzesAction.FetchPull,
  owner,
  name,
  prNumber,
});

const onAnalysisFetched = (analysisState: IAnalysisState) => ({
  type: AnalyzesAction.FetchedPull,
  analysisState,
});

export interface IAnalysisState {
  CreatedAt: string;
  CommitSHA: string;
  GithubPullRequestNumber: number;
  GithubRepoName: string;
  ResultJSON: IAnalysisResultJSON;
  Status: string;
}

interface IAnalysisResultJSON {
  GolangciLintRes: IGolangciLintRes;
  WorkerRes: IWorkerRes;
}

interface IWorkerRes {
  Timings: ITiming[];
  Warnings: IWarning[];
  Error: string;
}

interface ITiming {
  Name: string;
  DurationMs: number;
}

export interface IWarning {
  Tag: string;
  Text: string;
}

interface IGolangciLintRes {
  Issues: IIssue[];
  Report: {
    Warnings: IWarning[];
    Linters: ILinter[];
  };
}

interface ILinter {
  Name: string;
  Enabled: boolean;
  EnabledByDefault: boolean;
}

export interface IIssue {
  Text: string;
  HunkPos: number;
  FromLinter: string;
  Pos: IPos;
}

interface IPos {
  Line: number;
  Column: number;
  Filename: string;
}

export interface IAnalyzesStore {
  current?: IAnalysisState;
}

const current = (state: IAnalysisState = null, action: any): IAnalysisState => {
  switch (action.type) {
    case AnalyzesAction.FetchedPull:
      return action.analysisState;
    default:
      return state;
  }
};

export const reducer = combineReducers<IAnalyzesStore>({
  current,
});

function* doFetchPullAnalysis({prNumber, owner, name}: any) {
  const state: IAppStore = yield select();
  const apiUrl = `/v1/repos/${owner}/${name}/pulls/${prNumber}`;
  const resp = yield call(makeApiGetRequest, apiUrl, state.auth.cookie);
  if (!resp || resp.error) {
    yield* processError(apiUrl, resp, "Can't fetch analysis state");
  } else {
    yield put(onAnalysisFetched(resp.data));
  }
}

function* fetchAnalyzesWatcher() {
  yield takeEvery(AnalyzesAction.FetchPull, doFetchPullAnalysis);
}

export function getWatchers() {
  return [
    fork(fetchAnalyzesWatcher),
  ];
}
