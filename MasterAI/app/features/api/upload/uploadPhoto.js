import globalApiSlice from '../globalApiSlice';

const upload = globalApiSlice.injectEndpoints({
  endpoints: builder => ({
    uploadPhoto: builder.mutation({
      query: formData => ({
        url: 'upload',
        method: 'POST',
        body: formData,
      }),
    }),
    generateCaption: builder.mutation({
      query: formData => ({
        url: 'caption',
        method: 'POST',
        body: formData,
      }),
    }),
    postCaption: builder.mutation({
      query: formData => ({
        url: 'post',
        method: 'POST',
        body: formData,
      }),
    }),
    analyzeFeelings: builder.mutation({
      query: formData => ({
        url: 'feeling',
        method: 'POST',
        body: formData,
      }),
    }),

    analyzeAge: builder.mutation({
      query: formData => ({
        url: 'age',
        method: 'POST',
        body: formData,
      }),
    }),

    // tree analize

    treeAnalize: builder.mutation({
      query: formData => ({
        url: 'tree',
        method: 'POST',
        body: formData,
      }),
    }),

    // end

    // animal analize

    animalAnalize: builder.mutation({
      query: formData => ({
        url: 'animal',
        method: 'POST',
        body: formData,
      }),
    }),

    // end

    // AI image generation

    generateImage: builder.mutation({
      query: formData => ({
        url: 'image',
        method: 'POST',
        body: formData,
      }),
    }),
    // end
    // AI image generation

    aiImageEdite: builder.mutation({
      query: formData => ({
        url: 'editImage',
        method: 'POST',
        body: formData,
      }),
    }),
    // end

    // AI MathSolver

    mathSolver: builder.mutation({
      query: formData => ({
        url: 'mathsolver',
        method: 'POST',
        body: formData,
      }),
    }),

    report: builder.mutation({
      query: formData => ({
        url: 'user/report',
        method: 'POST',
        body: formData,
      }),
    }),

    // end
  }),
});
export const {
  useUploadPhotoMutation,
  useGenerateCaptionMutation,
  usePostCaptionMutation,
  useAnalyzeFeelingsMutation,
  useAnalyzeAgeMutation,
  useTreeAnalizeMutation,
  useAnimalAnalizeMutation,
  useMathSolverMutation,
  useReportMutation,
  useAiImageEditeMutation,
} = upload;
