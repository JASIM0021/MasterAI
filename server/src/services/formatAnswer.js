const formatResponseToJson = (responseText) => {
    const lines = responseText.split('\n');
    const formattedData = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('1. **')) {
        let question = lines[i].replace(/\*\*/g, '').trim();
        let answer = lines[i + 1].replace('**Answer: ', '').replace('**', '').trim();
        
        formattedData.push({ question, answer });
      }
    }
  
    return formattedData;
  };

  module.exports = formatResponseToJson