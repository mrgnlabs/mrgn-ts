import { Tool } from "langchain/tools";
import { getClient } from '../utils';

const getBanks = async () => {
  const client = await getClient();
  const banks = client.group.banks;

  const allBanksInformation = [...banks.values()].map(
    (bank) => bank.describe()
  );

  return JSON.stringify(allBanksInformation);
}

class BanksTool extends Tool {
    name = "bank-tool";
  
    description =
      "A tool to get information about marginfi token pools, which are internally called Banks. Useful when you need to answer questions about the state of liquidity pools on the marginfi protocol. Input should be null."
      
  
    constructor() {
      super();
    }
  
    async _call(): Promise<string> {
      return await getBanks();
    }
}

export { BanksTool }
