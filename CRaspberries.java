import java.util.*;
public class CRaspberries{
    public static void main(String[] args){
        Scanner sc  = new Scanner(System.in);
        int t = sc.nextInt();
        while(t-->0){
            int n = sc.nextInt();
            int k = sc.nextInt();
            int[] arr = new int[n];

            for(int i=0;i<n;i++){
                arr[i] = sc.nextInt();
            }

            int ans = Integer.MAX_VALUE;
            int even = 0;

            for(int a : arr){
                if(a%k == 0){
                    ans = 0;
                    break;
                }
                if(a%2==0){
                    even++;
                }
                ans = Math.min(ans, k - a%k);
            }
            if(k==4){
                if(even >= 2){
                    ans=0;
                }
                else if(even==1){
                    ans = Math.min(1, ans);
                }
                else{
                    ans = Math.min(2, ans);
                }
            }
            System.out.println(ans);
        }
        sc.close();
    }
}