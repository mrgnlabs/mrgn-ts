export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_key_core_public: {
        Row: {
          created_at: string
          email: string | null
          id: number
          key: string
          notes: string | null
          revoked_on: string | null
          telegram_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          key?: string
          notes?: string | null
          revoked_on?: string | null
          telegram_id?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          key?: string
          notes?: string | null
          revoked_on?: string | null
          telegram_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_core_public_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "api_tier_core_public"
            referencedColumns: ["tier"]
          },
        ]
      }
      api_tier_core_public: {
        Row: {
          id: number
          max_per_day: number
          max_per_hour: number
          max_per_minute: number
          max_per_month: number
          tier: string
        }
        Insert: {
          id?: number
          max_per_day: number
          max_per_hour: number
          max_per_minute: number
          max_per_month: number
          tier: string
        }
        Update: {
          id?: number
          max_per_day?: number
          max_per_hour?: number
          max_per_minute?: number
          max_per_month?: number
          tier?: string
        }
        Relationships: []
      }
      api_tier_path_access_core_public: {
        Row: {
          created_at: string
          id: number
          path: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          path: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          path?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tier_path_access_core_public_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "api_tier_core_public"
            referencedColumns: ["tier"]
          },
        ]
      }
      api_usage_core_public: {
        Row: {
          api_key: string
          created_at: string
          duration_ms: number | null
          id: number
          path: string
          status_code: number
          tier: string
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          duration_ms?: number | null
          id?: number
          path: string
          status_code: number
          tier: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          duration_ms?: number | null
          id?: number
          path?: string
          status_code?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_core_public_api_key_fkey"
            columns: ["api_key"]
            isOneToOne: false
            referencedRelation: "api_key_core_public"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "api_usage_core_public_tier_path_fkey"
            columns: ["tier", "path"]
            isOneToOne: false
            referencedRelation: "api_tier_path_access_core_public"
            referencedColumns: ["tier", "path"]
          },
        ]
      }
      arena_marginfi_events: {
        Row: {
          account: string
          action_type: string
          amount: number
          authority: string
          bank_address: string
          block_slot: number
          block_time: string
          created_at: string
          group_address: string
          id: number
          is_flashloan: boolean
          marginfi_event_type: string
          raw_account_keys: string[]
          repay_all: boolean | null
          sequence_number: number
          signature: string
          updated_at: string
          withdraw_all: boolean | null
        }
        Insert: {
          account: string
          action_type?: string
          amount: number
          authority: string
          bank_address: string
          block_slot: number
          block_time: string
          created_at?: string
          group_address: string
          id?: number
          is_flashloan?: boolean
          marginfi_event_type: string
          raw_account_keys?: string[]
          repay_all?: boolean | null
          sequence_number: number
          signature: string
          updated_at?: string
          withdraw_all?: boolean | null
        }
        Update: {
          account?: string
          action_type?: string
          amount?: number
          authority?: string
          bank_address?: string
          block_slot?: number
          block_time?: string
          created_at?: string
          group_address?: string
          id?: number
          is_flashloan?: boolean
          marginfi_event_type?: string
          raw_account_keys?: string[]
          repay_all?: boolean | null
          sequence_number?: number
          signature?: string
          updated_at?: string
          withdraw_all?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_marginfi_events_group_address_fkey"
            columns: ["group_address"]
            isOneToOne: false
            referencedRelation: "arena_pools"
            referencedColumns: ["group_address"]
          },
          {
            foreignKeyName: "arena_marginfi_events_group_address_fkey"
            columns: ["group_address"]
            isOneToOne: false
            referencedRelation: "arena_pools_with_luts"
            referencedColumns: ["group_address"]
          },
        ]
      }
      arena_pools: {
        Row: {
          base_bank_address: string
          created_at: string
          created_by: string | null
          featured: boolean
          group_address: string
          id: number
          quote_token_address: string
          status: string
        }
        Insert: {
          base_bank_address: string
          created_at?: string
          created_by?: string | null
          featured?: boolean
          group_address: string
          id?: number
          quote_token_address: string
          status?: string
        }
        Update: {
          base_bank_address?: string
          created_at?: string
          created_by?: string | null
          featured?: boolean
          group_address?: string
          id?: number
          quote_token_address?: string
          status?: string
        }
        Relationships: []
      }
      base_mrgn_account: {
        Row: {
          address: string
          created_at: string
          id: number
          mrgn_group: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: number
          mrgn_group: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: number
          mrgn_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_mrgn_account_mrgn_group_fkey"
            columns: ["mrgn_group"]
            isOneToOne: false
            referencedRelation: "base_mrgn_group"
            referencedColumns: ["address"]
          },
        ]
      }
      base_mrgn_bank: {
        Row: {
          address: string
          created_at: string
          id: number
          mint: string
          mint_decimals: number
          mrgn_group: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: number
          mint: string
          mint_decimals: number
          mrgn_group: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: number
          mint?: string
          mint_decimals?: number
          mrgn_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_mrgn_bank_mrgn_group_fkey"
            columns: ["mrgn_group"]
            isOneToOne: false
            referencedRelation: "base_mrgn_group"
            referencedColumns: ["address"]
          },
        ]
      }
      base_mrgn_group: {
        Row: {
          address: string
          created_at: string
          id: number
        }
        Insert: {
          address: string
          created_at?: string
          id?: number
        }
        Update: {
          address?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      birdeye_ohlcv_item: {
        Row: {
          address: string
          close: number
          created_at: string
          currency: string
          high: number
          id: number
          interval_type: string
          low: number
          open: number
          unix_time: number
          updated_at: string
          volume: number
        }
        Insert: {
          address: string
          close: number
          created_at?: string
          currency: string
          high: number
          id?: number
          interval_type: string
          low: number
          open: number
          unix_time: number
          updated_at?: string
          volume: number
        }
        Update: {
          address?: string
          close?: number
          created_at?: string
          currency?: string
          high?: number
          id?: number
          interval_type?: string
          low?: number
          open?: number
          unix_time?: number
          updated_at?: string
          volume?: number
        }
        Relationships: []
      }
      birdeye_price_data: {
        Row: {
          created_at: string
          id: number
          interval_type: string
          price_value: number
          time: string
          token_mint_address: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          interval_type: string
          price_value: number
          time: string
          token_mint_address: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          interval_type?: string
          price_value?: number
          time?: string
          token_mint_address?: string
          updated_at?: string
        }
        Relationships: []
      }
      birdeye_token_market_data: {
        Row: {
          address: string | null
          circulating_supply: number | null
          created_at: string
          fdv: number | null
          id: number
          liquidity: number | null
          market_cap: number | null
          price: number | null
          total_supply: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          circulating_supply?: number | null
          created_at?: string
          fdv?: number | null
          id?: number
          liquidity?: number | null
          market_cap?: number | null
          price?: number | null
          total_supply?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          circulating_supply?: number | null
          created_at?: string
          fdv?: number | null
          id?: number
          liquidity?: number | null
          market_cap?: number | null
          price?: number | null
          total_supply?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      birdeye_token_metadata: {
        Row: {
          address: string | null
          coingecko_id: string | null
          created_at: string
          decimals: number | null
          discord: string | null
          id: number
          logo_uri: string | null
          medium: string | null
          name: string | null
          symbol: string | null
          twitter: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          coingecko_id?: string | null
          created_at?: string
          decimals?: number | null
          discord?: string | null
          id?: number
          logo_uri?: string | null
          medium?: string | null
          name?: string | null
          symbol?: string | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          coingecko_id?: string | null
          created_at?: string
          decimals?: number | null
          discord?: string | null
          id?: number
          logo_uri?: string | null
          medium?: string | null
          name?: string | null
          symbol?: string | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      birdeye_token_trade_data: {
        Row: {
          address: string | null
          created_at: string
          holder: number | null
          id: number
          last_trade_human_time: string | null
          last_trade_unix_time: number | null
          market: number | null
          trade_data: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          holder?: number | null
          id?: number
          last_trade_human_time?: string | null
          last_trade_unix_time?: number | null
          market?: number | null
          trade_data?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          holder?: number | null
          id?: number
          last_trade_human_time?: string | null
          last_trade_unix_time?: number | null
          market?: number | null
          trade_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      birdeye_wallet_token_item: {
        Row: {
          address: string | null
          balance: number | null
          chain_id: string | null
          created_at: string
          decimals: number | null
          id: number
          logo_uri: string | null
          name: string | null
          price_usd: number | null
          symbol: string | null
          token_list_id: number | null
          ui_amount: number | null
          updated_at: string
          value_usd: number | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          chain_id?: string | null
          created_at?: string
          decimals?: number | null
          id?: number
          logo_uri?: string | null
          name?: string | null
          price_usd?: number | null
          symbol?: string | null
          token_list_id?: number | null
          ui_amount?: number | null
          updated_at?: string
          value_usd?: number | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          chain_id?: string | null
          created_at?: string
          decimals?: number | null
          id?: number
          logo_uri?: string | null
          name?: string | null
          price_usd?: number | null
          symbol?: string | null
          token_list_id?: number | null
          ui_amount?: number | null
          updated_at?: string
          value_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "birdeye_wallet_token_item_token_list_id_fkey"
            columns: ["token_list_id"]
            isOneToOne: false
            referencedRelation: "birdeye_wallet_token_list"
            referencedColumns: ["id"]
          },
        ]
      }
      birdeye_wallet_token_list: {
        Row: {
          created_at: string
          id: number
          total_usd: number | null
          updated_at: string
          wallet: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          total_usd?: number | null
          updated_at?: string
          wallet?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          total_usd?: number | null
          updated_at?: string
          wallet?: string | null
        }
        Relationships: []
      }
      dune_queries: {
        Row: {
          completed_at: string | null
          created_at: string
          end_time: string
          error_message: string | null
          execution_id: string | null
          id: number
          query_id: string
          query_parameters: Json
          start_time: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          end_time: string
          error_message?: string | null
          execution_id?: string | null
          id?: number
          query_id: string
          query_parameters?: Json
          start_time: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          end_time?: string
          error_message?: string | null
          execution_id?: string | null
          id?: number
          query_id?: string
          query_parameters?: Json
          start_time?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      dune_results: {
        Row: {
          created_at: string
          end_time: string
          id: number
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          query_id: number
          raw_data: Json
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: number
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          query_id: number
          raw_data: Json
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: number
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          query_id?: number
          raw_data?: Json
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dune_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "dune_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tracker: {
        Row: {
          begin_time: string | null
          created_at: string
          end_time: string | null
          error: Json | null
          finish_time: string | null
          heartbeat_interval_seconds: number
          heartbeat_time: string | null
          id: number
          job_type: number
          last_completed_time: string | null
          notes: Json | null
          start_at_time: string | null
          start_before_time: string | null
          start_time: string | null
          status: number
          updated_at: string
        }
        Insert: {
          begin_time?: string | null
          created_at?: string
          end_time?: string | null
          error?: Json | null
          finish_time?: string | null
          heartbeat_interval_seconds: number
          heartbeat_time?: string | null
          id?: number
          job_type: number
          last_completed_time?: string | null
          notes?: Json | null
          start_at_time?: string | null
          start_before_time?: string | null
          start_time?: string | null
          status: number
          updated_at?: string
        }
        Update: {
          begin_time?: string | null
          created_at?: string
          end_time?: string | null
          error?: Json | null
          finish_time?: string | null
          heartbeat_interval_seconds?: number
          heartbeat_time?: string | null
          id?: number
          job_type?: number
          last_completed_time?: string | null
          notes?: Json | null
          start_at_time?: string | null
          start_before_time?: string | null
          start_time?: string | null
          status?: number
          updated_at?: string
        }
        Relationships: []
      }
      lookup_tables: {
        Row: {
          address: string[]
          created_at: string
          group_address: string
          id: number
        }
        Insert: {
          address: string[]
          created_at?: string
          group_address: string
          id?: number
        }
        Update: {
          address?: string[]
          created_at?: string
          group_address?: string
          id?: number
        }
        Relationships: []
      }
      manual_token_mint_to_track: {
        Row: {
          address: string
          created_at: string
          id: number
          notes: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: number
          notes: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: number
          notes?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_wallet_address_to_track: {
        Row: {
          address: string
          created_at: string
          id: number
          notes: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: number
          notes: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: number
          notes?: string
          updated_at?: string
        }
        Relationships: []
      }
      marginfi_accounts: {
        Row: {
          address: string
          id: number
          integrator: number
          marginfi_group_id: number
          owner: string
          updated_at: string
        }
        Insert: {
          address: string
          id?: number
          integrator?: number
          marginfi_group_id: number
          owner: string
          updated_at?: string
        }
        Update: {
          address?: string
          id?: number
          integrator?: number
          marginfi_group_id?: number
          owner?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marginfi_accounts_marginfi_group_id_fkey"
            columns: ["marginfi_group_id"]
            isOneToOne: false
            referencedRelation: "marginfi_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      marginfi_banks: {
        Row: {
          address: string
          id: number
          liquidity_vault: string
          marginfi_group_id: number
          mint_id: number
          operational_state: number
          updated_at: string
        }
        Insert: {
          address: string
          id?: number
          liquidity_vault: string
          marginfi_group_id: number
          mint_id: number
          operational_state: number
          updated_at?: string
        }
        Update: {
          address?: string
          id?: number
          liquidity_vault?: string
          marginfi_group_id?: number
          mint_id?: number
          operational_state?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marginfi_banks_marginfi_group_id_fkey"
            columns: ["marginfi_group_id"]
            isOneToOne: false
            referencedRelation: "marginfi_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marginfi_banks_mint_id_fkey"
            columns: ["mint_id"]
            isOneToOne: false
            referencedRelation: "mints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marginfi_banks_operational_state_fkey"
            columns: ["operational_state"]
            isOneToOne: false
            referencedRelation: "operational_state"
            referencedColumns: ["id"]
          },
        ]
      }
      marginfi_groups: {
        Row: {
          address: string
          admin: string
          id: number
          updated_at: string
        }
        Insert: {
          address: string
          admin: string
          id?: number
          updated_at?: string
        }
        Update: {
          address?: string
          admin?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      metric_accounts: {
        Row: {
          marginfi_account_id: number
          positions: Database["public"]["CompositeTypes"]["user_position"][]
          time: string
        }
        Insert: {
          marginfi_account_id: number
          positions: Database["public"]["CompositeTypes"]["user_position"][]
          time: string
        }
        Update: {
          marginfi_account_id?: number
          positions?: Database["public"]["CompositeTypes"]["user_position"][]
          time?: string
        }
        Relationships: []
      }
      metric_banks: {
        Row: {
          asset_weight_initial: number
          asset_weight_maintenance: number
          borrow_limit: number
          borrow_rate_pct: number
          deposit_limit: number
          deposit_rate_pct: number
          emissions_mint: string
          emissions_rate: number
          emissions_remaining: number
          flags: number
          freeze_settings: boolean
          insurance_fees_collected: number
          insurance_fees_pending: number
          insurance_fixed_fee_apr: number
          insurance_ir_fee_rate: number
          last_update: string
          liability_weight_initial: number
          liability_weight_maintenance: number
          marginfi_bank_id: number
          max_interest_rate: number
          operational_state: number
          optimal_utilization_ratio: number
          oracle_id: number
          oracle_max_age: number
          permissionless_bad_debt_settlement: boolean
          plateau_interest_rate: number
          protocol_fees_collected: number
          protocol_fees_pending: number
          protocol_fixed_fee_apr: number
          protocol_ir_fee_rate: number
          protocol_origination_fee: number
          risk_tier: number
          time: string
          total_asset_value_init_limit: number
          total_borrows: number
          total_deposits: number
        }
        Insert: {
          asset_weight_initial?: number
          asset_weight_maintenance?: number
          borrow_limit?: number
          borrow_rate_pct?: number
          deposit_limit?: number
          deposit_rate_pct?: number
          emissions_mint?: string
          emissions_rate?: number
          emissions_remaining?: number
          flags?: number
          freeze_settings?: boolean
          insurance_fees_collected?: number
          insurance_fees_pending?: number
          insurance_fixed_fee_apr?: number
          insurance_ir_fee_rate?: number
          last_update: string
          liability_weight_initial?: number
          liability_weight_maintenance?: number
          marginfi_bank_id: number
          max_interest_rate?: number
          operational_state?: number
          optimal_utilization_ratio?: number
          oracle_id: number
          oracle_max_age?: number
          permissionless_bad_debt_settlement?: boolean
          plateau_interest_rate?: number
          protocol_fees_collected?: number
          protocol_fees_pending?: number
          protocol_fixed_fee_apr?: number
          protocol_ir_fee_rate?: number
          protocol_origination_fee?: number
          risk_tier?: number
          time: string
          total_asset_value_init_limit?: number
          total_borrows?: number
          total_deposits: number
        }
        Update: {
          asset_weight_initial?: number
          asset_weight_maintenance?: number
          borrow_limit?: number
          borrow_rate_pct?: number
          deposit_limit?: number
          deposit_rate_pct?: number
          emissions_mint?: string
          emissions_rate?: number
          emissions_remaining?: number
          flags?: number
          freeze_settings?: boolean
          insurance_fees_collected?: number
          insurance_fees_pending?: number
          insurance_fixed_fee_apr?: number
          insurance_ir_fee_rate?: number
          last_update?: string
          liability_weight_initial?: number
          liability_weight_maintenance?: number
          marginfi_bank_id?: number
          max_interest_rate?: number
          operational_state?: number
          optimal_utilization_ratio?: number
          oracle_id?: number
          oracle_max_age?: number
          permissionless_bad_debt_settlement?: boolean
          plateau_interest_rate?: number
          protocol_fees_collected?: number
          protocol_fees_pending?: number
          protocol_fixed_fee_apr?: number
          protocol_ir_fee_rate?: number
          protocol_origination_fee?: number
          risk_tier?: number
          time?: string
          total_asset_value_init_limit?: number
          total_borrows?: number
          total_deposits?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_banks_marginfi_bank_id_fkey"
            columns: ["marginfi_bank_id"]
            isOneToOne: false
            referencedRelation: "marginfi_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_banks_operational_state_fkey"
            columns: ["operational_state"]
            isOneToOne: false
            referencedRelation: "operational_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_banks_oracle_id_fkey"
            columns: ["oracle_id"]
            isOneToOne: false
            referencedRelation: "oracles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_banks_risk_tier_fkey"
            columns: ["risk_tier"]
            isOneToOne: false
            referencedRelation: "risk_tier"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_oracles: {
        Row: {
          confidence: number
          oracle_id: number
          price: number
          time: string
        }
        Insert: {
          confidence: number
          oracle_id: number
          price: number
          time: string
        }
        Update: {
          confidence?: number
          oracle_id?: number
          price?: number
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_oracles_oracle_id_fkey"
            columns: ["oracle_id"]
            isOneToOne: false
            referencedRelation: "oracles"
            referencedColumns: ["id"]
          },
        ]
      }
      mints: {
        Row: {
          address: string
          decimals: number
          id: number
          name: string | null
          symbol: string | null
          token_program: string
          updated_at: string
        }
        Insert: {
          address: string
          decimals: number
          id?: number
          name?: string | null
          symbol?: string | null
          token_program: string
          updated_at?: string
        }
        Update: {
          address?: string
          decimals?: number
          id?: number
          name?: string | null
          symbol?: string | null
          token_program?: string
          updated_at?: string
        }
        Relationships: []
      }
      operational_state: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      oracles: {
        Row: {
          address: string
          id: number
          updated_at: string
        }
        Insert: {
          address: string
          id?: number
          updated_at?: string
        }
        Update: {
          address?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      parsed_state_snapshots_account: {
        Row: {
          account_flags: number
          authority: string
          base_account_id: number
          created_at: string
          emissions_destination_account: string
          health_cache_asset_value: number
          health_cache_flags: number
          health_cache_liability_value: number
          health_cache_timestamp: number
          id: number
          parse_version: number
          raw_snapshot_id: number
        }
        Insert: {
          account_flags: number
          authority?: string
          base_account_id: number
          created_at?: string
          emissions_destination_account: string
          health_cache_asset_value: number
          health_cache_flags: number
          health_cache_liability_value: number
          health_cache_timestamp: number
          id?: number
          parse_version: number
          raw_snapshot_id: number
        }
        Update: {
          account_flags?: number
          authority?: string
          base_account_id?: number
          created_at?: string
          emissions_destination_account?: string
          health_cache_asset_value?: number
          health_cache_flags?: number
          health_cache_liability_value?: number
          health_cache_timestamp?: number
          id?: number
          parse_version?: number
          raw_snapshot_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "parsed_state_snapshots_account_base_account_id_fkey"
            columns: ["base_account_id"]
            isOneToOne: false
            referencedRelation: "base_mrgn_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "raw_state_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_raw_state_snapshots_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_group"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_state_snapshots_account_balance: {
        Row: {
          asset_shares: number
          bank_asset_tag: number
          bank_pk: string | null
          created_at: string
          emissions_outstanding: number
          id: number
          index: number
          last_update: number
          liability_shares: number
          parse_version: number
          parsed_account_id: number
          price: number
          raw_snapshot_id: number
        }
        Insert: {
          asset_shares: number
          bank_asset_tag: number
          bank_pk?: string | null
          created_at?: string
          emissions_outstanding: number
          id?: number
          index: number
          last_update: number
          liability_shares: number
          parse_version: number
          parsed_account_id: number
          price: number
          raw_snapshot_id: number
        }
        Update: {
          asset_shares?: number
          bank_asset_tag?: number
          bank_pk?: string | null
          created_at?: string
          emissions_outstanding?: number
          id?: number
          index?: number
          last_update?: number
          liability_shares?: number
          parse_version?: number
          parsed_account_id?: number
          price?: number
          raw_snapshot_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_bank_pk_fkey"
            columns: ["bank_pk"]
            isOneToOne: false
            referencedRelation: "base_mrgn_bank"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_parsed_account_id_fkey"
            columns: ["parsed_account_id"]
            isOneToOne: false
            referencedRelation: "parsed_state_snapshots_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "raw_state_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_raw_state_snapshots_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_group"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_state_snapshots_bank: {
        Row: {
          asset_share_value: number
          asset_tag: number
          asset_weight_init: number
          asset_weight_maint: number
          base_bank_id: number
          borrow_limit: number
          collected_group_fees_outstanding: number
          collected_insurance_fees_outstanding: number
          created_at: string
          deposit_limit: number
          fee_vault: string
          fee_vault_authority_bump: number
          fee_vault_bump: number
          id: number
          insurance_fee_fixed_apr: number
          insurance_ir_fee: number
          insurance_vault: string
          insurance_vault_authority_bump: number
          insurance_vault_bump: number
          last_update: number
          liability_share_value: number
          liability_weight_init: number
          liability_weight_maint: number
          liquidity_vault: string
          liquidity_vault_authority_bump: number
          liquidity_vault_bump: number
          max_interest_rate: number
          operational_state: number
          optimal_utilization_rate: number
          oracle_keys: string[]
          oracle_max_age: number
          oracle_setup: number
          parse_version: number
          plateau_interest_rate: number
          protocol_fixed_fee_apr: number
          protocol_ir_fee: number
          protocol_origination_fee: number
          raw_snapshot_id: number
          risk_tier: number
          total_asset_shares: number
          total_asset_value_init_limit: number
          total_liability_shares: number
        }
        Insert: {
          asset_share_value: number
          asset_tag: number
          asset_weight_init: number
          asset_weight_maint: number
          base_bank_id: number
          borrow_limit: number
          collected_group_fees_outstanding: number
          collected_insurance_fees_outstanding: number
          created_at?: string
          deposit_limit: number
          fee_vault: string
          fee_vault_authority_bump: number
          fee_vault_bump: number
          id?: number
          insurance_fee_fixed_apr: number
          insurance_ir_fee: number
          insurance_vault: string
          insurance_vault_authority_bump: number
          insurance_vault_bump: number
          last_update: number
          liability_share_value: number
          liability_weight_init: number
          liability_weight_maint: number
          liquidity_vault: string
          liquidity_vault_authority_bump: number
          liquidity_vault_bump: number
          max_interest_rate: number
          operational_state: number
          optimal_utilization_rate: number
          oracle_keys: string[]
          oracle_max_age: number
          oracle_setup: number
          parse_version: number
          plateau_interest_rate: number
          protocol_fixed_fee_apr: number
          protocol_ir_fee: number
          protocol_origination_fee: number
          raw_snapshot_id: number
          risk_tier: number
          total_asset_shares: number
          total_asset_value_init_limit: number
          total_liability_shares: number
        }
        Update: {
          asset_share_value?: number
          asset_tag?: number
          asset_weight_init?: number
          asset_weight_maint?: number
          base_bank_id?: number
          borrow_limit?: number
          collected_group_fees_outstanding?: number
          collected_insurance_fees_outstanding?: number
          created_at?: string
          deposit_limit?: number
          fee_vault?: string
          fee_vault_authority_bump?: number
          fee_vault_bump?: number
          id?: number
          insurance_fee_fixed_apr?: number
          insurance_ir_fee?: number
          insurance_vault?: string
          insurance_vault_authority_bump?: number
          insurance_vault_bump?: number
          last_update?: number
          liability_share_value?: number
          liability_weight_init?: number
          liability_weight_maint?: number
          liquidity_vault?: string
          liquidity_vault_authority_bump?: number
          liquidity_vault_bump?: number
          max_interest_rate?: number
          operational_state?: number
          optimal_utilization_rate?: number
          oracle_keys?: string[]
          oracle_max_age?: number
          oracle_setup?: number
          parse_version?: number
          plateau_interest_rate?: number
          protocol_fixed_fee_apr?: number
          protocol_ir_fee?: number
          protocol_origination_fee?: number
          raw_snapshot_id?: number
          risk_tier?: number
          total_asset_shares?: number
          total_asset_value_init_limit?: number
          total_liability_shares?: number
        }
        Relationships: [
          {
            foreignKeyName: "parsed_state_snapshots_bank_base_bank_id_fkey"
            columns: ["base_bank_id"]
            isOneToOne: false
            referencedRelation: "base_mrgn_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_bank_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "raw_state_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_bank_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_raw_state_snapshots_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_bank_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_bank_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_bank_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_group"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_state_snapshots_group: {
        Row: {
          admin: string
          banks: number
          base_group_id: number
          created_at: string
          emode_admin: string
          global_fee_wallet: string
          group_flags: number
          id: number
          parse_version: number
          program_fee_fixed: number
          program_fee_rate: number
          raw_snapshot_id: number
        }
        Insert: {
          admin?: string
          banks: number
          base_group_id: number
          created_at?: string
          emode_admin: string
          global_fee_wallet: string
          group_flags: number
          id?: number
          parse_version: number
          program_fee_fixed: number
          program_fee_rate: number
          raw_snapshot_id: number
        }
        Update: {
          admin?: string
          banks?: number
          base_group_id?: number
          created_at?: string
          emode_admin?: string
          global_fee_wallet?: string
          group_flags?: number
          id?: number
          parse_version?: number
          program_fee_fixed?: number
          program_fee_rate?: number
          raw_snapshot_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "parsed_state_snapshots_group_base_group_id_fkey"
            columns: ["base_group_id"]
            isOneToOne: false
            referencedRelation: "base_mrgn_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_group_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "raw_state_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_group_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_raw_state_snapshots_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_group_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_group_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_group_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_group"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_borrow: {
        Row: {
          amount: number
          bank: string
          bank_liquidity_vault_authority: string
          created_at: string
          destination_token_account: string
          group: string
          id: number
          instruction_id: number
          liquidity_vault: string
          marginfi_account: string
          token_program: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank: string
          bank_liquidity_vault_authority: string
          created_at?: string
          destination_token_account: string
          group: string
          id?: number
          instruction_id: number
          liquidity_vault: string
          marginfi_account: string
          token_program: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string
          bank_liquidity_vault_authority?: string
          created_at?: string
          destination_token_account?: string
          group?: string
          id?: number
          instruction_id?: number
          liquidity_vault?: string
          marginfi_account?: string
          token_program?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_borrow_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_borrow_event: {
        Row: {
          amount: number
          bank: string
          created_at: string
          id: number
          instruction_id: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          mint: string
          signer: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank: string
          created_at?: string
          id?: number
          instruction_id: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          mint: string
          signer?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string
          created_at?: string
          id?: number
          instruction_id?: number
          marginfi_account?: string
          marginfi_account_authority?: string
          marginfi_group?: string
          mint?: string
          signer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_borrow__instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_deposit: {
        Row: {
          amount: number
          bank: string
          created_at: string
          deposit_up_to_limit: boolean
          group: string
          id: number
          instruction_id: number
          liquidity_vault: string
          marginfi_account: string
          signer_token_account: string
          token_program: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank: string
          created_at?: string
          deposit_up_to_limit: boolean
          group: string
          id?: number
          instruction_id: number
          liquidity_vault: string
          marginfi_account: string
          signer_token_account: string
          token_program: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string
          created_at?: string
          deposit_up_to_limit?: boolean
          group?: string
          id?: number
          instruction_id?: number
          liquidity_vault?: string
          marginfi_account?: string
          signer_token_account?: string
          token_program?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_deposit_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_deposit_event: {
        Row: {
          amount: number
          bank: string
          created_at: string
          id: number
          instruction_id: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          mint: string
          signer: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank: string
          created_at?: string
          id?: number
          instruction_id: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          mint: string
          signer?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string
          created_at?: string
          id?: number
          instruction_id?: number
          marginfi_account?: string
          marginfi_account_authority?: string
          marginfi_group?: string
          mint?: string
          signer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_deposi_instruction_id_fkey1"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_liquidate: {
        Row: {
          asset_amount: number
          asset_bank: string
          authority: string
          bank_insurance_vault: string
          bank_liquidity_vault: string
          bank_liquidity_vault_authority: string
          created_at: string
          group: string
          id: number
          instruction_id: number
          liab_bank: string
          liquidatee_marginfi_account: string
          liquidator_marginfi_account: string
          updated_at: string
        }
        Insert: {
          asset_amount: number
          asset_bank: string
          authority: string
          bank_insurance_vault: string
          bank_liquidity_vault: string
          bank_liquidity_vault_authority: string
          created_at?: string
          group: string
          id?: number
          instruction_id: number
          liab_bank: string
          liquidatee_marginfi_account: string
          liquidator_marginfi_account: string
          updated_at?: string
        }
        Update: {
          asset_amount?: number
          asset_bank?: string
          authority?: string
          bank_insurance_vault?: string
          bank_liquidity_vault?: string
          bank_liquidity_vault_authority?: string
          created_at?: string
          group?: string
          id?: number
          instruction_id?: number
          liab_bank?: string
          liquidatee_marginfi_account?: string
          liquidator_marginfi_account?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_liquida_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_liquidate_event: {
        Row: {
          asset_bank: string
          asset_mint: string
          created_at: string
          id: number
          instruction_id: number
          liability_bank: string
          liability_mint: string
          liquidatee_marginfi_account: string
          liquidatee_marginfi_account_authority: string
          liquidatee_post_health: number
          liquidatee_pre_health: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          post_balances_liquidatee_asset_balance: number
          post_balances_liquidatee_liability_balance: number
          post_balances_liquidator_asset_balance: number
          post_balances_liquidator_liability_balance: number
          pre_balances_liquidatee_asset_balance: number
          pre_balances_liquidatee_liability_balance: number
          pre_balances_liquidator_asset_balance: number
          pre_balances_liquidator_liability_balance: number
          signer: string | null
          updated_at: string
        }
        Insert: {
          asset_bank: string
          asset_mint: string
          created_at?: string
          id?: number
          instruction_id: number
          liability_bank: string
          liability_mint: string
          liquidatee_marginfi_account: string
          liquidatee_marginfi_account_authority: string
          liquidatee_post_health?: number
          liquidatee_pre_health?: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          post_balances_liquidatee_asset_balance?: number
          post_balances_liquidatee_liability_balance?: number
          post_balances_liquidator_asset_balance?: number
          post_balances_liquidator_liability_balance?: number
          pre_balances_liquidatee_asset_balance?: number
          pre_balances_liquidatee_liability_balance?: number
          pre_balances_liquidator_asset_balance?: number
          pre_balances_liquidator_liability_balance?: number
          signer?: string | null
          updated_at?: string
        }
        Update: {
          asset_bank?: string
          asset_mint?: string
          created_at?: string
          id?: number
          instruction_id?: number
          liability_bank?: string
          liability_mint?: string
          liquidatee_marginfi_account?: string
          liquidatee_marginfi_account_authority?: string
          liquidatee_post_health?: number
          liquidatee_pre_health?: number
          marginfi_account?: string
          marginfi_account_authority?: string
          marginfi_group?: string
          post_balances_liquidatee_asset_balance?: number
          post_balances_liquidatee_liability_balance?: number
          post_balances_liquidator_asset_balance?: number
          post_balances_liquidator_liability_balance?: number
          pre_balances_liquidatee_asset_balance?: number
          pre_balances_liquidatee_liability_balance?: number
          pre_balances_liquidator_asset_balance?: number
          pre_balances_liquidator_liability_balance?: number
          signer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_liquid_instruction_id_fkey1"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_repay: {
        Row: {
          amount: number
          bank: string
          created_at: string
          group: string
          id: number
          instruction_id: number
          liquidity_vault: string
          marginfi_account: string
          repay_all: boolean
          signer_token_account: string
          token_program: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank: string
          created_at?: string
          group: string
          id?: number
          instruction_id: number
          liquidity_vault: string
          marginfi_account: string
          repay_all: boolean
          signer_token_account: string
          token_program: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string
          created_at?: string
          group?: string
          id?: number
          instruction_id?: number
          liquidity_vault?: string
          marginfi_account?: string
          repay_all?: boolean
          signer_token_account?: string
          token_program?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_repay_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_repay_event: {
        Row: {
          amount: number
          bank: string
          close_balance: boolean
          created_at: string
          id: number
          instruction_id: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          mint: string
          signer: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank: string
          close_balance: boolean
          created_at?: string
          id?: number
          instruction_id: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          mint: string
          signer?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string
          close_balance?: boolean
          created_at?: string
          id?: number
          instruction_id?: number
          marginfi_account?: string
          marginfi_account_authority?: string
          marginfi_group?: string
          mint?: string
          signer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_repay_e_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_withdraw: {
        Row: {
          amount: number
          bank: string
          bank_liquidity_vault_authority: string
          created_at: string
          destination_token_account: string
          group: string
          id: number
          instruction_id: number
          liquidity_vault: string
          marginfi_account: string
          updated_at: string
          withdraw_all: boolean
        }
        Insert: {
          amount: number
          bank: string
          bank_liquidity_vault_authority: string
          created_at?: string
          destination_token_account: string
          group: string
          id?: number
          instruction_id: number
          liquidity_vault: string
          marginfi_account: string
          updated_at?: string
          withdraw_all: boolean
        }
        Update: {
          amount?: number
          bank?: string
          bank_liquidity_vault_authority?: string
          created_at?: string
          destination_token_account?: string
          group?: string
          id?: number
          instruction_id?: number
          liquidity_vault?: string
          marginfi_account?: string
          updated_at?: string
          withdraw_all?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_withdra_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_transactions_lending_account_withdraw_event: {
        Row: {
          amount: number
          bank: string
          close_balance: boolean
          created_at: string
          id: number
          instruction_id: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          mint: string
          signer: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank: string
          close_balance: boolean
          created_at?: string
          id?: number
          instruction_id: number
          marginfi_account: string
          marginfi_account_authority: string
          marginfi_group: string
          mint: string
          signer?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string
          close_balance?: boolean
          created_at?: string
          id?: number
          instruction_id?: number
          marginfi_account?: string
          marginfi_account_authority?: string
          marginfi_group?: string
          mint?: string
          signer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parsed_transactions_lending_account_withdr_instruction_id_fkey1"
            columns: ["instruction_id"]
            isOneToOne: true
            referencedRelation: "raw_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      points_last_metric: {
        Row: {
          marginfi_account_id: number
          time: string
        }
        Insert: {
          marginfi_account_id: number
          time: string
        }
        Update: {
          marginfi_account_id?: number
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_last_metric_marginfi_account_id_fkey"
            columns: ["marginfi_account_id"]
            isOneToOne: true
            referencedRelation: "marginfi_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_instructions: {
        Row: {
          accounts: string[]
          created_at: string
          id: number
          instruction_index: number
          instruction_type: string
          program_id: string
          stack_height: number
          transaction_id: number
          updated_at: string
        }
        Insert: {
          accounts: string[]
          created_at?: string
          id?: number
          instruction_index: number
          instruction_type: string
          program_id: string
          stack_height: number
          transaction_id: number
          updated_at?: string
        }
        Update: {
          accounts?: string[]
          created_at?: string
          id?: number
          instruction_index?: number
          instruction_type?: string
          program_id?: string
          stack_height?: number
          transaction_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_instructions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "raw_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_state_snapshots: {
        Row: {
          address: string
          created_at: string
          data: string
          data_type: number
          id: number
          last_seen_at: string
          last_seen_slot: number | null
          slot: number | null
        }
        Insert: {
          address: string
          created_at?: string
          data: string
          data_type: number
          id?: number
          last_seen_at?: string
          last_seen_slot?: number | null
          slot?: number | null
        }
        Update: {
          address?: string
          created_at?: string
          data?: string
          data_type?: number
          id?: number
          last_seen_at?: string
          last_seen_slot?: number | null
          slot?: number | null
        }
        Relationships: []
      }
      raw_transactions: {
        Row: {
          block_slot: number
          block_time: string
          created_at: string
          id: number
          signature: string
          updated_at: string
        }
        Insert: {
          block_slot: number
          block_time: string
          created_at?: string
          id?: number
          signature: string
          updated_at?: string
        }
        Update: {
          block_slot?: number
          block_time?: string
          created_at?: string
          id?: number
          signature?: string
          updated_at?: string
        }
        Relationships: []
      }
      real_time_accounts: {
        Row: {
          address: string
          health: number
          marginfi_group: string
          owner: string
          positions: Database["public"]["CompositeTypes"]["real_time_user_position"][]
          time: string
          total_assets_in_usd: number
          total_assets_in_usd_initial: number
          total_assets_in_usd_maintenance: number
          total_liabilities_in_usd: number
          total_liabilities_in_usd_initial: number
          total_liabilities_in_usd_maintenance: number
        }
        Insert: {
          address: string
          health?: number
          marginfi_group: string
          owner: string
          positions: Database["public"]["CompositeTypes"]["real_time_user_position"][]
          time: string
          total_assets_in_usd?: number
          total_assets_in_usd_initial?: number
          total_assets_in_usd_maintenance?: number
          total_liabilities_in_usd?: number
          total_liabilities_in_usd_initial?: number
          total_liabilities_in_usd_maintenance?: number
        }
        Update: {
          address?: string
          health?: number
          marginfi_group?: string
          owner?: string
          positions?: Database["public"]["CompositeTypes"]["real_time_user_position"][]
          time?: string
          total_assets_in_usd?: number
          total_assets_in_usd_initial?: number
          total_assets_in_usd_maintenance?: number
          total_liabilities_in_usd?: number
          total_liabilities_in_usd_initial?: number
          total_liabilities_in_usd_maintenance?: number
        }
        Relationships: []
      }
      real_time_banks: {
        Row: {
          address: string
          asset_share_value: number
          borrow_limit: number
          borrow_limit_usd: number
          borrow_rate_pct: number
          deposit_limit: number
          deposit_limit_usd: number
          deposit_rate_pct: number
          emissions_rate: number
          emissions_remaining: number
          flags: number
          freeze_settings: boolean
          high_price: number
          insurance_fees_collected: number
          insurance_fees_collected_usd: number
          insurance_fees_pending: number
          insurance_fees_pending_usd: number
          liability_share_value: number
          low_price: number
          marginfi_group: string
          mid_price: number
          mint_address: string
          operational_state: number
          permissionless_bad_debt_settlement: boolean
          protocol_fees_collected: number
          protocol_fees_collected_usd: number
          protocol_fees_pending: number
          protocol_fees_pending_usd: number
          protocol_origination_fee: number
          risk_tier: number
          time: string
          total_borrows: number
          total_borrows_usd: number
          total_deposits: number
          total_deposits_usd: number
          vault_balance: number
          vault_balance_usd: number
        }
        Insert: {
          address: string
          asset_share_value: number
          borrow_limit?: number
          borrow_limit_usd?: number
          borrow_rate_pct?: number
          deposit_limit?: number
          deposit_limit_usd?: number
          deposit_rate_pct?: number
          emissions_rate?: number
          emissions_remaining?: number
          flags?: number
          freeze_settings?: boolean
          high_price?: number
          insurance_fees_collected?: number
          insurance_fees_collected_usd?: number
          insurance_fees_pending?: number
          insurance_fees_pending_usd?: number
          liability_share_value: number
          low_price?: number
          marginfi_group: string
          mid_price?: number
          mint_address?: string
          operational_state?: number
          permissionless_bad_debt_settlement?: boolean
          protocol_fees_collected?: number
          protocol_fees_collected_usd?: number
          protocol_fees_pending?: number
          protocol_fees_pending_usd?: number
          protocol_origination_fee?: number
          risk_tier?: number
          time: string
          total_borrows?: number
          total_borrows_usd?: number
          total_deposits?: number
          total_deposits_usd?: number
          vault_balance?: number
          vault_balance_usd?: number
        }
        Update: {
          address?: string
          asset_share_value?: number
          borrow_limit?: number
          borrow_limit_usd?: number
          borrow_rate_pct?: number
          deposit_limit?: number
          deposit_limit_usd?: number
          deposit_rate_pct?: number
          emissions_rate?: number
          emissions_remaining?: number
          flags?: number
          freeze_settings?: boolean
          high_price?: number
          insurance_fees_collected?: number
          insurance_fees_collected_usd?: number
          insurance_fees_pending?: number
          insurance_fees_pending_usd?: number
          liability_share_value?: number
          low_price?: number
          marginfi_group?: string
          mid_price?: number
          mint_address?: string
          operational_state?: number
          permissionless_bad_debt_settlement?: boolean
          protocol_fees_collected?: number
          protocol_fees_collected_usd?: number
          protocol_fees_pending?: number
          protocol_fees_pending_usd?: number
          protocol_origination_fee?: number
          risk_tier?: number
          time?: string
          total_borrows?: number
          total_borrows_usd?: number
          total_deposits?: number
          total_deposits_usd?: number
          vault_balance?: number
          vault_balance_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "real_time_banks_operational_state_fkey"
            columns: ["operational_state"]
            isOneToOne: false
            referencedRelation: "operational_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_time_banks_risk_tier_fkey"
            columns: ["risk_tier"]
            isOneToOne: false
            referencedRelation: "risk_tier"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_tier: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      arena_pools_with_luts: {
        Row: {
          base_bank_address: string | null
          created_at: string | null
          created_by: string | null
          featured: boolean | null
          group_address: string | null
          id: number | null
          lookup_tables: string[] | null
          quote_token_address: string | null
          status: string | null
        }
        Relationships: []
      }
      v_account_balance_with_empty_positions: {
        Row: {
          asset_shares: number | null
          bank_asset_tag: number | null
          bank_pk: string | null
          created_at: string | null
          emissions_outstanding: number | null
          index: number | null
          last_update: number | null
          liability_shares: number | null
          parse_version: number | null
          parsed_account_id: number | null
          price: number | null
          raw_snapshot_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_bank_pk_fkey"
            columns: ["bank_pk"]
            isOneToOne: false
            referencedRelation: "base_mrgn_bank"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_parsed_account_id_fkey"
            columns: ["parsed_account_id"]
            isOneToOne: false
            referencedRelation: "parsed_state_snapshots_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "raw_state_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_raw_state_snapshots_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parsed_state_snapshots_account_balance_raw_snapshot_id_fkey"
            columns: ["raw_snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_unparsed_state_snapshots_group"
            referencedColumns: ["id"]
          },
        ]
      }
      v_job_tracker_readable: {
        Row: {
          begin_time: string | null
          created_at: string | null
          end_time: string | null
          error: Json | null
          finish_time: string | null
          heartbeat_interval_seconds: number | null
          heartbeat_time: string | null
          id: number | null
          job_type: number | null
          job_type_str: string | null
          last_completed_time: string | null
          notes: Json | null
          start_at_time: string | null
          start_before_time: string | null
          start_time: string | null
          status: number | null
          status_str: string | null
          updated_at: string | null
        }
        Insert: {
          begin_time?: string | null
          created_at?: string | null
          end_time?: string | null
          error?: Json | null
          finish_time?: string | null
          heartbeat_interval_seconds?: number | null
          heartbeat_time?: string | null
          id?: number | null
          job_type?: number | null
          job_type_str?: never
          last_completed_time?: string | null
          notes?: Json | null
          start_at_time?: string | null
          start_before_time?: string | null
          start_time?: string | null
          status?: number | null
          status_str?: never
          updated_at?: string | null
        }
        Update: {
          begin_time?: string | null
          created_at?: string | null
          end_time?: string | null
          error?: Json | null
          finish_time?: string | null
          heartbeat_interval_seconds?: number | null
          heartbeat_time?: string | null
          id?: number | null
          job_type?: number | null
          job_type_str?: never
          last_completed_time?: string | null
          notes?: Json | null
          start_at_time?: string | null
          start_before_time?: string | null
          start_time?: string | null
          status?: number | null
          status_str?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      v_jobs_expired: {
        Row: {
          begin_time: string | null
          created_at: string | null
          end_time: string | null
          error: Json | null
          finish_time: string | null
          heartbeat_interval_seconds: number | null
          heartbeat_time: string | null
          id: number | null
          job_type: number | null
          last_completed_time: string | null
          notes: Json | null
          start_at_time: string | null
          start_before_time: string | null
          start_time: string | null
          status: number | null
          updated_at: string | null
        }
        Insert: {
          begin_time?: string | null
          created_at?: string | null
          end_time?: string | null
          error?: Json | null
          finish_time?: string | null
          heartbeat_interval_seconds?: number | null
          heartbeat_time?: string | null
          id?: number | null
          job_type?: number | null
          last_completed_time?: string | null
          notes?: Json | null
          start_at_time?: string | null
          start_before_time?: string | null
          start_time?: string | null
          status?: number | null
          updated_at?: string | null
        }
        Update: {
          begin_time?: string | null
          created_at?: string | null
          end_time?: string | null
          error?: Json | null
          finish_time?: string | null
          heartbeat_interval_seconds?: number | null
          heartbeat_time?: string | null
          id?: number | null
          job_type?: number | null
          last_completed_time?: string | null
          notes?: Json | null
          start_at_time?: string | null
          start_before_time?: string | null
          start_time?: string | null
          status?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_jobs_with_stale_heartbeat: {
        Row: {
          begin_time: string | null
          created_at: string | null
          end_time: string | null
          error: Json | null
          finish_time: string | null
          heartbeat_interval_seconds: number | null
          heartbeat_time: string | null
          id: number | null
          job_type: number | null
          last_completed_time: string | null
          notes: Json | null
          start_at_time: string | null
          start_before_time: string | null
          start_time: string | null
          status: number | null
          updated_at: string | null
        }
        Insert: {
          begin_time?: string | null
          created_at?: string | null
          end_time?: string | null
          error?: Json | null
          finish_time?: string | null
          heartbeat_interval_seconds?: number | null
          heartbeat_time?: string | null
          id?: number | null
          job_type?: number | null
          last_completed_time?: string | null
          notes?: Json | null
          start_at_time?: string | null
          start_before_time?: string | null
          start_time?: string | null
          status?: number | null
          updated_at?: string | null
        }
        Update: {
          begin_time?: string | null
          created_at?: string | null
          end_time?: string | null
          error?: Json | null
          finish_time?: string | null
          heartbeat_interval_seconds?: number | null
          heartbeat_time?: string | null
          id?: number | null
          job_type?: number | null
          last_completed_time?: string | null
          notes?: Json | null
          start_at_time?: string | null
          start_before_time?: string | null
          start_time?: string | null
          status?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_raw_state_snapshots_readable: {
        Row: {
          address: string | null
          created_at: string | null
          data: string | null
          data_hex: string | null
          data_type: string | null
          id: number | null
          last_seen_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          data?: string | null
          data_hex?: never
          data_type?: never
          id?: number | null
          last_seen_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          data?: string | null
          data_hex?: never
          data_type?: never
          id?: number | null
          last_seen_at?: string | null
        }
        Relationships: []
      }
      v_token_addresses_to_track: {
        Row: {
          address: string | null
        }
        Relationships: []
      }
      v_unparsed_state_snapshots_account: {
        Row: {
          address: string | null
          created_at: string | null
          data: string | null
          data_type: number | null
          id: number | null
          last_seen_at: string | null
          last_seen_slot: number | null
          slot: number | null
        }
        Relationships: []
      }
      v_unparsed_state_snapshots_bank: {
        Row: {
          address: string | null
          created_at: string | null
          data: string | null
          data_type: number | null
          id: number | null
          last_seen_at: string | null
          last_seen_slot: number | null
          slot: number | null
        }
        Relationships: []
      }
      v_unparsed_state_snapshots_group: {
        Row: {
          address: string | null
          created_at: string | null
          data: string | null
          data_type: number | null
          id: number | null
          last_seen_at: string | null
          last_seen_slot: number | null
          slot: number | null
        }
        Relationships: []
      }
      v_usage_limit_summary: {
        Row: {
          api_key: string | null
          day_usage: number | null
          hour_usage: number | null
          max_per_day: number | null
          max_per_hour: number | null
          max_per_minute: number | null
          max_per_month: number | null
          minute_usage: number | null
          month_usage: number | null
          over_day_limit: boolean | null
          over_hour_limit: boolean | null
          over_minute_limit: boolean | null
          over_month_limit: boolean | null
          tier: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_core_public_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "api_tier_core_public"
            referencedColumns: ["tier"]
          },
          {
            foreignKeyName: "api_usage_core_public_api_key_fkey"
            columns: ["api_key"]
            isOneToOne: false
            referencedRelation: "api_key_core_public"
            referencedColumns: ["key"]
          },
        ]
      }
      v_wallet_addresses_to_track: {
        Row: {
          address: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_group_id: {
        Args: { group_address: string }
        Returns: number
      }
      get_mint_id: {
        Args: { mint_address: string }
        Returns: number
      }
    }
    Enums: {
      balance_side: "Asset" | "Liability"
    }
    CompositeTypes: {
      real_time_user_position: {
        bank_address: string | null
        is_asset: boolean | null
        amount: number | null
        value: number | null
        emissions_outstanding: number | null
        shares: number | null
      }
      user_position: {
        bank_id: number | null
        is_asset: boolean | null
        amount: number | null
        emissions_outstanding: number | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      balance_side: ["Asset", "Liability"],
    },
  },
} as const
