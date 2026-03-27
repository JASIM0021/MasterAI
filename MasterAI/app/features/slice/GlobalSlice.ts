
import { createSlice } from "@reduxjs/toolkit";
import { PayloadAction } from "typesafe-actions";

const GlobalSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    file:null,
    loader:false,
    error:null,
    products:[{
      id:1242352,
      name:'demo1',
      price:100,
      brand:'jasim'
    }]
  },
  reducers: {
    saveUser: (state, action) => {
      state.user = action.payload;
      
    },
    registrationSuccess(state, action: any) {
      console.log('action', action)
      state.user = action.payload;
      state.error = null;
      state.loader = false
    },
    registrationError(state, action:any) {
      console.log('action', action)
      state.user = null;
      state.error = action.payload;
      state.loader = false
    },

    productFetchSuccess(state,action:any){
      console.log('action', action)
      state.products = action.payload
    },
    startLoading(state){
      console.log('state', state)
      state.loader = true
    },
    stopLoading(state){
      state.loader = false
    },
    saveFile(state,action){
      state.file = action.payload
    }
  
  },
});

export const { saveUser,saveFile, registrationSuccess,registrationError,productFetchSuccess,startLoading,stopLoading} = GlobalSlice.actions;
export default GlobalSlice.reducer;

